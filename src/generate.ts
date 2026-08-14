import { PACKKIT_PROTOCOL_VERSION } from '@packkit/core';
import type { GeneratedGoProject, GoConfig, GoConfigInput } from './types.js';
import { GENERATOR_ID, PROVENANCE_SCHEMA_VERSION } from './constants.js';
import { normalizeConfig } from './options.js';
import { packageName } from './naming.js';
import { provenance } from './provenance.js';
import { buildBaseline } from './baseline.js';
import { deriveDeploymentContract } from './deployment.js';
import { licenseText } from './license.js';

/** Generate a Go project in memory. Deterministic: same config → same bytes. */
export function generate(
	input: GoConfigInput,
	options: { preset?: string; version?: string } = {},
): GeneratedGoProject {
	const config = normalizeConfig(input);
	const pkg = packageName(config.name);

	// The logic always lives in a testable package at the module root; a CLI/worker adds
	// a thin cmd/ main that wires it up (idiomatic Go — keep main minimal).
	const files: Record<string, string> = {
		'go.mod': goMod(config),
		'README.md': readme(config, pkg),
		'.gitignore': gitignore(),
	};
	if (config.target === 'worker') {
		files['handler.go'] = workerHandlerGo(config, pkg);
		files['handler_test.go'] = workerHandlerTestGo(pkg);
		files['worker.go'] = workerRunnerGo(pkg);
		files['worker_test.go'] = workerTestGo(pkg);
		files[`cmd/${pkg}/main.go`] = workerMainGo(config, pkg);
		files['Dockerfile'] = workerDockerfile(config, pkg);
		files['.dockerignore'] = dockerignore();
	} else if (config.target === 'service') {
		files['handler.go'] = serviceHandlerGo(config, pkg);
		files['handler_test.go'] = serviceHandlerTestGo(pkg);
		files['server.go'] = serviceServerGo(pkg);
		files['server_test.go'] = serviceServerTestGo(pkg);
		files[`cmd/${pkg}/main.go`] = serviceMainGo(config, pkg);
		files['Dockerfile'] = serviceDockerfile(config, pkg);
		files['.dockerignore'] = dockerignore();
	} else {
		files[`${pkg}.go`] = libGo(config, pkg);
		files[`${pkg}_test.go`] = libTestGo(pkg);
		if (config.target === 'cli') files[`cmd/${pkg}/main.go`] = cliMainGo(config, pkg);
	}
	if (config.license !== 'none')
		files['LICENSE'] = licenseText(config.license as 'MIT', authorName(config.author));

	const baseline = buildBaseline(files);
	files['packkit.json'] = provenance(config, {
		preset: options.preset,
		version: options.version,
		baseline,
	});

	return {
		config,
		files,
		diagnostics: [],
		metadata: {
			generatorId: GENERATOR_ID,
			generatorVersion: options.version,
			protocolVersion: PACKKIT_PROTOCOL_VERSION,
			schemaVersion: PROVENANCE_SCHEMA_VERSION,
			preset: options.preset,
		},
		deploymentContract: deriveDeploymentContract(config),
		summary: {
			modulePath: config.module,
			packageName: pkg,
			target: config.target,
			fileCount: Object.keys(files).length,
		},
	};
}

// "DanMat <dan@example.com>" → "DanMat"
function authorName(author: string): string {
	return author.replace(/<[^>]*>/, '').trim() || 'The authors';
}

// A Go package comment must start with "Package <name>" (go vet), so the sentence is
// lowercased and appended.
function packageSummary(cfg: GoConfig, fallback = 'provides a friendly greeting.'): string {
	const s = cfg.description?.trim() || fallback;
	const lowered = s.charAt(0).toLowerCase() + s.slice(1);
	return lowered.endsWith('.') ? lowered : `${lowered}.`;
}

function goMod(cfg: GoConfig): string {
	return `module ${cfg.module}\n\ngo ${cfg.goVersion}\n`;
}

function libGo(cfg: GoConfig, pkg: string): string {
	return [
		`// Package ${pkg} ${packageSummary(cfg)}`,
		`package ${pkg}`,
		'',
		'// Greet returns a friendly greeting for name.',
		'func Greet(name string) string {',
		'\treturn "Hello, " + name + "!"',
		'}',
		'',
	].join('\n');
}

// A thin command that keeps zero logic of its own: it parses a flag (or a positional
// arg) and delegates to the library package, so the behavior stays unit-tested there.
function cliMainGo(cfg: GoConfig, pkg: string): string {
	return [
		`// Command ${pkg} greets a name from the command line.`,
		'package main',
		'',
		'import (',
		'\t"flag"',
		'\t"fmt"',
		'\t"os"',
		'',
		`\t"${cfg.module}"`,
		')',
		'',
		'func main() {',
		'\tname := flag.String("name", "world", "who to greet")',
		'\tflag.Parse()',
		'\t// A positional argument wins over the flag: `' + pkg + ' Alice`.',
		'\tif flag.NArg() > 0 {',
		'\t\t*name = flag.Arg(0)',
		'\t}',
		`\tfmt.Fprintln(os.Stdout, ${pkg}.Greet(*name))`,
		'}',
		'',
	].join('\n');
}

function libTestGo(pkg: string): string {
	return [
		`package ${pkg}`,
		'',
		'import "testing"',
		'',
		'func TestGreet(t *testing.T) {',
		'\tgot := Greet("world")',
		'\twant := "Hello, world!"',
		'\tif got != want {',
		'\t\tt.Errorf("Greet(%q) = %q, want %q", "world", got, want)',
		'\t}',
		'}',
		'',
	].join('\n');
}

function readme(cfg: GoConfig, pkg: string): string {
	const lines = [
		`# ${cfg.name}`,
		'',
		`> ${cfg.description || 'A modern Go module scaffolded with [create-packkit-go](https://github.com/PackkitJS/create-packkit-go).'}`,
		'',
		'## Develop',
		'',
		'```sh',
		'go test ./...',
		'go build ./...',
		'go vet ./...',
		'```',
		'',
	];
	if (cfg.target === 'cli') {
		lines.push(
			'## Run',
			'',
			'```sh',
			`go run ./cmd/${pkg} Alice   # or: --name Alice`,
			`go install ./cmd/${pkg}     # installs the ${pkg} binary`,
			'```',
			'',
		);
	} else if (cfg.target === 'service') {
		lines.push(
			'## Run',
			'',
			'An HTTP service on `net/http`. It binds `$PORT` (default 8080), serves `/` and a',
			'`/healthz` liveness probe, logs JSON lines on stdout, and **drains in-flight requests',
			'on `SIGTERM`/`SIGINT`** before exiting 0.',
			'',
			'```sh',
			`go run ./cmd/${pkg}   # then: curl localhost:8080/healthz`,
			'```',
			'',
			'Container (`docker stop` sends `SIGTERM`, so the server drains):',
			'',
			'```sh',
			`docker build -t ${pkg} . && docker run -p 8080:8080 ${pkg}`,
			'```',
			'',
			'Set `PORT` to change the listen port.',
			'',
		);
	} else if (cfg.target === 'worker') {
		lines.push(
			'## Run',
			'',
			'A long-running background worker: it reads newline-delimited messages from stdin',
			'(the demo source seam — swap `receive` for your transport), processes each with',
			'bounded retries, and **drains in-flight work on `SIGTERM`/`SIGINT` before exiting 0**.',
			'Logs are JSON lines on stdout; liveness is the process, so there is no HTTP port.',
			'',
			'```sh',
			`printf 'one\\ntwo\\n' | go run ./cmd/${pkg}`,
			'```',
			'',
			'Container (`docker stop` sends `SIGTERM`, so the worker drains):',
			'',
			'```sh',
			`docker build -t ${pkg} . && docker run -i ${pkg}`,
			'```',
			'',
			'Tune with `WORKER_MAX_ATTEMPTS` (default 3) and `WORKER_LOG_LEVEL` (default info).',
			'',
		);
	} else {
		lines.push('## Use', '', '```go', `import "${cfg.module}"`, '```', '');
	}
	return lines.join('\n');
}

// The unit-testable seam: one message in, an error out on failure. No queue, no I/O.
function workerHandlerGo(cfg: GoConfig, pkg: string): string {
	return [
		`// Package ${pkg} ${packageSummary(cfg, `is a background worker; Handle is its unit-testable core.`)}`,
		`package ${pkg}`,
		'',
		'import (',
		'\t"errors"',
		'\t"strings"',
		')',
		'',
		'// Handle processes one message. Pure: no queue, no I/O, no logging. Replace the body',
		'// with your processing; return an error to signal a failure the worker should retry',
		'// (and, after WORKER_MAX_ATTEMPTS, route to the poison-message handler).',
		'func Handle(message string) error {',
		'\tif strings.TrimSpace(message) == "" {',
		'\t\treturn errors.New("empty message")',
		'\t}',
		'\t// TODO: replace with your processing.',
		'\treturn nil',
		'}',
		'',
	].join('\n');
}

function workerHandlerTestGo(pkg: string): string {
	return [
		`package ${pkg}`,
		'',
		'import "testing"',
		'',
		'func TestHandleAcceptsAMessage(t *testing.T) {',
		'\tif err := Handle("hello"); err != nil {',
		'\t\tt.Fatalf("Handle returned an error: %v", err)',
		'\t}',
		'}',
		'',
		'func TestHandleRejectsAnEmptyMessage(t *testing.T) {',
		'\tif err := Handle("   "); err == nil {',
		'\t\tt.Fatal("expected an error for an empty message")',
		'\t}',
		'}',
		'',
	].join('\n');
}

// The runner: a transport-agnostic loop with bounded retries, JSON logs, a poison seam,
// and a context-driven drain that exits 0 on SIGTERM/SIGINT (no blocking read that would
// hang a shutdown — the reader is a goroutine feeding a channel the loop selects on).
function workerRunnerGo(pkg: string): string {
	return [
		`package ${pkg}`,
		'',
		'import (',
		'\t"bufio"',
		'\t"context"',
		'\t"encoding/json"',
		'\t"io"',
		'\t"os"',
		'\t"strconv"',
		')',
		'',
		"// Config is the worker's environment-driven configuration.",
		'type Config struct {',
		'\tMaxAttempts int',
		'\tLogLevel    string',
		'}',
		'',
		'func configFromEnv() Config {',
		'\tcfg := Config{MaxAttempts: 3, LogLevel: "info"}',
		'\tif v := os.Getenv("WORKER_MAX_ATTEMPTS"); v != "" {',
		'\t\tif n, err := strconv.Atoi(v); err == nil && n > 0 {',
		'\t\t\tcfg.MaxAttempts = n',
		'\t\t}',
		'\t}',
		'\tif v := os.Getenv("WORKER_LOG_LEVEL"); v != "" {',
		'\t\tcfg.LogLevel = v',
		'\t}',
		'\treturn cfg',
		'}',
		'',
		'// logEvent emits one structured JSON line on stdout.',
		'func logEvent(level, event string, fields map[string]any) {',
		'\tentry := map[string]any{"level": level, "event": event}',
		'\tfor k, v := range fields {',
		'\t\tentry[k] = v',
		'\t}',
		'\tline, _ := json.Marshal(entry)',
		"\tos.Stdout.Write(append(line, '\\n'))",
		'}',
		'',
		'// receive is the message-source seam: a demo that reads newline-delimited messages',
		"// from stdin. Replace with your transport's receive loop (SQS, Kafka, Redis, ...). It",
		'// closes the channel on EOF; the reader goroutine also stops when ctx is cancelled.',
		'func receive(ctx context.Context, r io.Reader) <-chan string {',
		'\tout := make(chan string)',
		'\tgo func() {',
		'\t\tdefer close(out)',
		'\t\tscanner := bufio.NewScanner(r)',
		'\t\tfor scanner.Scan() {',
		'\t\t\tselect {',
		'\t\t\tcase out <- scanner.Text():',
		'\t\t\tcase <-ctx.Done():',
		'\t\t\t\treturn',
		'\t\t\t}',
		'\t\t}',
		'\t}()',
		'\treturn out',
		'}',
		'',
		'// onPoison handles a message that failed every attempt. Default: log and drop. Replace',
		'// with a dead-letter queue, a table, an alert — whatever poison means for your system.',
		'func onPoison(message string, err error) {',
		'\tlogEvent("error", "poison_message", map[string]any{"message": message, "error": err.Error()})',
		'}',
		'',
		'// process runs the handler with bounded retries.',
		'func process(message string, cfg Config) {',
		'\tfor attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {',
		'\t\terr := Handle(message)',
		'\t\tif err == nil {',
		'\t\t\tlogEvent("info", "handled", map[string]any{"message": message, "attempt": attempt})',
		'\t\t\treturn',
		'\t\t}',
		'\t\tlogEvent("warning", "handle_failed", map[string]any{"message": message, "attempt": attempt, "error": err.Error()})',
		'\t\tif attempt == cfg.MaxAttempts {',
		'\t\t\tonPoison(message, err)',
		'\t\t}',
		'\t}',
		'}',
		'',
		'// Run pulls messages from stdin, processes each with bounded retries, and drains',
		'// in-flight work when ctx is cancelled (SIGTERM/SIGINT) before returning 0. Liveness is',
		'// the process itself — no HTTP port, no health endpoint.',
		'func Run(ctx context.Context) int {',
		'\tcfg := configFromEnv()',
		'\tlogEvent("info", "worker_started", map[string]any{"maxAttempts": cfg.MaxAttempts})',
		'',
		'\tmessages := receive(ctx, os.Stdin)',
		'\tprocessed := 0',
		'\tdrained := false',
		'loop:',
		'\tfor {',
		'\t\tselect {',
		'\t\tcase <-ctx.Done():',
		'\t\t\tdrained = true',
		'\t\t\tbreak loop',
		'\t\tcase message, ok := <-messages:',
		'\t\t\tif !ok {',
		'\t\t\t\tbreak loop // the source is exhausted (EOF)',
		'\t\t\t}',
		'\t\t\tprocess(message, cfg) // finish this message before re-checking shutdown',
		'\t\t\tprocessed++',
		'\t\t}',
		'\t}',
		'\tlogEvent("info", "worker_stopped", map[string]any{"processed": processed, "drained": drained})',
		'\treturn 0',
		'}',
		'',
	].join('\n');
}

function workerMainGo(cfg: GoConfig, pkg: string): string {
	return [
		`// Command ${pkg} runs the background worker until SIGTERM/SIGINT, then drains and exits.`,
		'package main',
		'',
		'import (',
		'\t"context"',
		'\t"os"',
		'\t"os/signal"',
		'\t"syscall"',
		'',
		`\t"${cfg.module}"`,
		')',
		'',
		'func main() {',
		'\tctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)',
		'\tdefer stop()',
		`\tos.Exit(${pkg}.Run(ctx))`,
		'}',
		'',
	].join('\n');
}

// The cross-language proof: build the command, feed it a message, SIGTERM it, and assert
// it drained the in-flight work and exited 0 — the same guarantee the JS/Python workers make.
function workerTestGo(pkg: string): string {
	return [
		`package ${pkg}`,
		'',
		'import (',
		'\t"os"',
		'\t"os/exec"',
		'\t"path/filepath"',
		'\t"strings"',
		'\t"syscall"',
		'\t"testing"',
		'\t"time"',
		')',
		'',
		'func TestWorkerDrainsOnSIGTERMAndExitsZero(t *testing.T) {',
		'\tbin := filepath.Join(t.TempDir(), "worker")',
		`\tbuild := exec.Command("go", "build", "-o", bin, "./cmd/${pkg}")`,
		'\tbuild.Stderr = os.Stderr',
		'\tif err := build.Run(); err != nil {',
		'\t\tt.Fatalf("build failed: %v", err)',
		'\t}',
		'',
		'\tcmd := exec.Command(bin)',
		'\tstdin, err := cmd.StdinPipe()',
		'\tif err != nil {',
		'\t\tt.Fatal(err)',
		'\t}',
		'\tvar out strings.Builder',
		'\tcmd.Stdout = &out',
		'\tcmd.Stderr = os.Stderr',
		'\tif err := cmd.Start(); err != nil {',
		'\t\tt.Fatalf("start failed: %v", err)',
		'\t}',
		'',
		'\tif _, err := stdin.Write([]byte("one\\n")); err != nil {',
		'\t\tt.Fatal(err)',
		'\t}',
		'\ttime.Sleep(500 * time.Millisecond) // let the in-flight message be handled',
		'\tif err := cmd.Process.Signal(syscall.SIGTERM); err != nil {',
		'\t\tt.Fatal(err)',
		'\t}',
		'',
		'\tdone := make(chan error, 1)',
		'\tgo func() { done <- cmd.Wait() }()',
		'\tselect {',
		'\tcase err := <-done:',
		'\t\tif err != nil {',
		'\t\t\tt.Fatalf("worker exited non-zero: %v", err)',
		'\t\t}',
		'\tcase <-time.After(10 * time.Second):',
		'\t\t_ = cmd.Process.Kill()',
		'\t\tt.Fatal("worker did not exit within 10s of SIGTERM")',
		'\t}',
		'',
		'\tif !strings.Contains(out.String(), `"event":"handled"`) {',
		'\t\tt.Errorf("expected a handled event; got:\\n%s", out.String())',
		'\t}',
		'\tif !strings.Contains(out.String(), `"event":"worker_stopped"`) {',
		'\t\tt.Errorf("expected a worker_stopped event; got:\\n%s", out.String())',
		'\t}',
		'}',
		'',
	].join('\n');
}

// The HTTP router is the testable seam: exercised with net/http/httptest, no port.
function serviceHandlerGo(cfg: GoConfig, pkg: string): string {
	return [
		`// Package ${pkg} ${packageSummary(cfg, 'is an HTTP service; NewHandler builds its router.')}`,
		`package ${pkg}`,
		'',
		'import (',
		'\t"encoding/json"',
		'\t"net/http"',
		')',
		'',
		'// NewHandler builds the service router. Kept separate from the server so it can be',
		'// exercised with net/http/httptest — no port, no process. Add your routes here.',
		'func NewHandler() http.Handler {',
		'\tmux := http.NewServeMux()',
		'\tmux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {',
		'\t\twriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})',
		'\t})',
		'\tmux.HandleFunc("GET /", func(w http.ResponseWriter, _ *http.Request) {',
		'\t\twriteJSON(w, http.StatusOK, map[string]string{"message": "Hello, world!"})',
		'\t})',
		'\treturn mux',
		'}',
		'',
		'func writeJSON(w http.ResponseWriter, status int, body any) {',
		'\tw.Header().Set("Content-Type", "application/json")',
		'\tw.WriteHeader(status)',
		'\t_ = json.NewEncoder(w).Encode(body)',
		'}',
		'',
	].join('\n');
}

function serviceHandlerTestGo(pkg: string): string {
	return [
		`package ${pkg}`,
		'',
		'import (',
		'\t"net/http"',
		'\t"net/http/httptest"',
		'\t"testing"',
		')',
		'',
		'func TestHealthz(t *testing.T) {',
		'\treq := httptest.NewRequest(http.MethodGet, "/healthz", nil)',
		'\trec := httptest.NewRecorder()',
		'\tNewHandler().ServeHTTP(rec, req)',
		'\tif rec.Code != http.StatusOK {',
		'\t\tt.Fatalf("GET /healthz = %d, want %d", rec.Code, http.StatusOK)',
		'\t}',
		'\tif ct := rec.Header().Get("Content-Type"); ct != "application/json" {',
		'\t\tt.Errorf("Content-Type = %q, want application/json", ct)',
		'\t}',
		'}',
		'',
		'func TestRoot(t *testing.T) {',
		'\treq := httptest.NewRequest(http.MethodGet, "/", nil)',
		'\trec := httptest.NewRecorder()',
		'\tNewHandler().ServeHTTP(rec, req)',
		'\tif rec.Code != http.StatusOK {',
		'\t\tt.Fatalf("GET / = %d, want %d", rec.Code, http.StatusOK)',
		'\t}',
		'}',
		'',
	].join('\n');
}

// The server: binds $PORT, and on ctx cancel (SIGTERM/SIGINT) drains in-flight requests
// via http.Server.Shutdown before returning — graceful shutdown, liveness is the port.
function serviceServerGo(pkg: string): string {
	return [
		`package ${pkg}`,
		'',
		'import (',
		'\t"context"',
		'\t"encoding/json"',
		'\t"errors"',
		'\t"net/http"',
		'\t"os"',
		'\t"time"',
		')',
		'',
		'// Run starts the HTTP server on $PORT (default 8080) and blocks until ctx is',
		'// cancelled, then gracefully drains in-flight requests before returning. The int is',
		'// an exit code for main to pass to os.Exit.',
		'func Run(ctx context.Context) int {',
		'\tport := os.Getenv("PORT")',
		'\tif port == "" {',
		'\t\tport = "8080"',
		'\t}',
		'\tsrv := &http.Server{Addr: ":" + port, Handler: NewHandler()}',
		'',
		'\terrCh := make(chan error, 1)',
		'\tgo func() {',
		'\t\tlogEvent("service_started", map[string]any{"port": port})',
		'\t\tif err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {',
		'\t\t\terrCh <- err',
		'\t\t}',
		'\t}()',
		'',
		'\tselect {',
		'\tcase <-ctx.Done():',
		'\t\tlogEvent("shutdown_requested", nil)',
		'\tcase err := <-errCh:',
		'\t\tlogEvent("server_error", map[string]any{"error": err.Error()})',
		'\t\treturn 1',
		'\t}',
		'',
		'\tshutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)',
		'\tdefer cancel()',
		'\tif err := srv.Shutdown(shutdownCtx); err != nil {',
		'\t\tlogEvent("shutdown_error", map[string]any{"error": err.Error()})',
		'\t\treturn 1',
		'\t}',
		'\tlogEvent("service_stopped", nil)',
		'\treturn 0',
		'}',
		'',
		'// logEvent emits one structured JSON line on stdout.',
		'func logEvent(event string, fields map[string]any) {',
		'\tentry := map[string]any{"event": event}',
		'\tfor k, v := range fields {',
		'\t\tentry[k] = v',
		'\t}',
		'\tline, _ := json.Marshal(entry)',
		"\tos.Stdout.Write(append(line, '\\n'))",
		'}',
		'',
	].join('\n');
}

// Boots the real server on an ephemeral port, hits /healthz, then cancels the context
// and asserts a graceful shutdown (Run returns 0).
function serviceServerTestGo(pkg: string): string {
	return [
		`package ${pkg}`,
		'',
		'import (',
		'\t"context"',
		'\t"net"',
		'\t"net/http"',
		'\t"testing"',
		'\t"time"',
		')',
		'',
		'func TestServerServesHealthzAndShutsDownGracefully(t *testing.T) {',
		'\tport := freePort(t)',
		'\tt.Setenv("PORT", port)',
		'',
		'\tctx, cancel := context.WithCancel(context.Background())',
		'\tdone := make(chan int, 1)',
		'\tgo func() { done <- Run(ctx) }()',
		'',
		'\tbase := "http://127.0.0.1:" + port',
		'\twaitReady(t, base+"/healthz")',
		'\tresp, err := http.Get(base + "/healthz")',
		'\tif err != nil {',
		'\t\tt.Fatalf("GET /healthz: %v", err)',
		'\t}',
		'\tresp.Body.Close()',
		'\tif resp.StatusCode != http.StatusOK {',
		'\t\tt.Fatalf("GET /healthz = %d, want 200", resp.StatusCode)',
		'\t}',
		'',
		'\tcancel() // triggers graceful shutdown',
		'\tselect {',
		'\tcase code := <-done:',
		'\t\tif code != 0 {',
		'\t\t\tt.Fatalf("Run returned %d, want 0", code)',
		'\t\t}',
		'\tcase <-time.After(10 * time.Second):',
		'\t\tt.Fatal("server did not shut down within 10s")',
		'\t}',
		'}',
		'',
		'// freePort reserves an ephemeral port and releases it for the server to rebind.',
		'func freePort(t *testing.T) string {',
		'\tt.Helper()',
		'\tln, err := net.Listen("tcp", "127.0.0.1:0")',
		'\tif err != nil {',
		'\t\tt.Fatal(err)',
		'\t}',
		'\tdefer ln.Close()',
		'\t_, port, _ := net.SplitHostPort(ln.Addr().String())',
		'\treturn port',
		'}',
		'',
		'func waitReady(t *testing.T, url string) {',
		'\tt.Helper()',
		'\tfor range 100 {',
		'\t\tresp, err := http.Get(url)',
		'\t\tif err == nil {',
		'\t\t\tresp.Body.Close()',
		'\t\t\treturn',
		'\t\t}',
		'\t\ttime.Sleep(50 * time.Millisecond)',
		'\t}',
		'\tt.Fatal("server never became ready")',
		'}',
		'',
	].join('\n');
}

function serviceMainGo(cfg: GoConfig, pkg: string): string {
	return [
		`// Command ${pkg} runs the HTTP service until SIGTERM/SIGINT, then drains and exits.`,
		'package main',
		'',
		'import (',
		'\t"context"',
		'\t"os"',
		'\t"os/signal"',
		'\t"syscall"',
		'',
		`\t"${cfg.module}"`,
		')',
		'',
		'func main() {',
		'\tctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)',
		'\tdefer stop()',
		`\tos.Exit(${pkg}.Run(ctx))`,
		'}',
		'',
	].join('\n');
}

function serviceDockerfile(cfg: GoConfig, pkg: string): string {
	return [
		'# Container image for the HTTP service. It listens on 8080 (override with PORT).',
		`FROM golang:${cfg.goVersion} AS build`,
		'WORKDIR /src',
		'COPY . .',
		`RUN CGO_ENABLED=0 go build -o /bin/server ./cmd/${pkg}`,
		'',
		'FROM gcr.io/distroless/static-debian12:nonroot',
		'COPY --from=build /bin/server /bin/server',
		'EXPOSE 8080',
		'# STOPSIGNAL makes `docker stop` send SIGTERM so the server drains before exit.',
		'STOPSIGNAL SIGTERM',
		'ENTRYPOINT ["/bin/server"]',
		'',
	].join('\n');
}

function workerDockerfile(cfg: GoConfig, pkg: string): string {
	return [
		'# Container image for the worker. A worker is a long-running process, NOT an HTTP',
		'# server — so there is no EXPOSE and no HTTP HEALTHCHECK; liveness is the process.',
		`FROM golang:${cfg.goVersion} AS build`,
		'WORKDIR /src',
		'COPY . .',
		`RUN CGO_ENABLED=0 go build -o /bin/worker ./cmd/${pkg}`,
		'',
		'FROM gcr.io/distroless/static-debian12:nonroot',
		'COPY --from=build /bin/worker /bin/worker',
		'# STOPSIGNAL makes `docker stop` send SIGTERM so the worker drains before exit.',
		'STOPSIGNAL SIGTERM',
		'ENTRYPOINT ["/bin/worker"]',
		'',
	].join('\n');
}

function dockerignore(): string {
	return [
		'# Keep the build context lean.',
		'.git/',
		'*.test',
		'*.out',
		'coverage.txt',
		'/vendor/',
		'Dockerfile',
		'.dockerignore',
		'README.md',
		'',
	].join('\n');
}

function gitignore(): string {
	return [
		'# Binaries',
		'*.exe',
		'*.dll',
		'*.so',
		'*.dylib',
		'',
		'# Test binary / coverage',
		'*.test',
		'*.out',
		'coverage.txt',
		'',
		'# Go workspace file',
		'go.work',
		'go.work.sum',
		'',
		'# Vendored dependencies',
		'/vendor/',
		'',
	].join('\n');
}
