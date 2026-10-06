const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const deployScript = path.resolve(__dirname, '../deploy.sh');

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'saskiweb-deploy-'));
  fs.copyFileSync(deployScript, path.join(root, 'deploy.sh'));
  fs.chmodSync(path.join(root, 'deploy.sh'), 0o755);

  const publicFiles = [
    '.htaccess',
    'index.htm',
    'index.htm.old.htm',
    'list.php',
    'favicon.ico',
    'robots.txt',
    'sitemap.xml',
    'styles.css',
    '404.shtml',
    'css/site.css',
    'js/site.js',
    'cv/cv.pdf',
    'cv/index.html',
    'cv/portrait.png',
    'notes/assets/cover.jpeg',
    'notes/assets/fonts/handwriting.woff2',
    'notes/feed.xml',
    'notes/first-note.html',
  ];
  const internalFiles = [
    '.env.deploy',
    '.agents/skills/private.md',
    '.github/workflows/deploy.yml',
    'docs/deployment.md',
    'tests/deploy.test.js',
    'content/draft.md',
    'content/private.html',
    'scripts/build.js',
    'templates/note.html',
    'node_modules/example/index.js',
    'package.json',
    'package-lock.json',
    'README.md',
  ];

  for (const file of [...publicFiles, ...internalFiles]) {
    const absolutePath = path.join(root, file);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `fixture: ${file}\n`);
  }

  const bin = path.join(root, 'fake-bin');
  fs.mkdirSync(bin);
  writeExecutable(
    path.join(bin, 'ssh'),
    '#!/bin/sh\nexit "${FAKE_SSH_EXIT:-0}"\n',
  );
  writeExecutable(
    path.join(bin, 'rsync'),
    '#!/bin/sh\nprintf "%s\\n" "$@" > "$DEPLOY_CAPTURE_ARGS"\n'
      + 'for arg in "$@"; do\n'
      + '  case "$arg" in --files-from=*) cat "${arg#*=}" > "$DEPLOY_CAPTURE_FILES" ;; esac\n'
      + 'done\n',
  );
  writeExecutable(
    path.join(bin, 'lftp'),
    '#!/bin/sh\nprintf "%s\\n" "$@" > "$DEPLOY_CAPTURE_ARGS"\nexit "${FAKE_LFTP_EXIT:-0}"\n',
  );

  return { root, bin, publicFiles, internalFiles };
}

function writeExecutable(file, contents) {
  fs.writeFileSync(file, contents, { mode: 0o755 });
}

function deploy(fixture, args, transport, overrides = {}) {
  const captureArgs = path.join(fixture.root, `${transport}-args.txt`);
  const captureFiles = path.join(fixture.root, `${transport}-files.txt`);
  const result = spawnSync('bash', [path.join(fixture.root, 'deploy.sh'), ...args], {
    cwd: fixture.root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${fixture.bin}:${process.env.PATH}`,
      SITE5_HOST: 'example.invalid',
      SITE5_USER: 'fixture-user',
      SITE5_REMOTE_PATH: '/public_html',
      SITE5_PASSWORD: 'fixture-password',
      DEPLOY_CAPTURE_ARGS: captureArgs,
      DEPLOY_CAPTURE_FILES: captureFiles,
      FAKE_SSH_EXIT: transport === 'rsync' ? '0' : '1',
      ...overrides,
    },
  });
  return {
    ...result,
    capturedArgs: fs.existsSync(captureArgs) ? fs.readFileSync(captureArgs, 'utf8') : '',
    capturedFiles: fs.existsSync(captureFiles)
      ? fs.readFileSync(captureFiles, 'utf8').trimEnd().split('\n').filter(Boolean)
      : [],
  };
}

function lftpPutFiles(capturedArgs) {
  const command = capturedArgs.match(/\n-e\n([\s\S]*?)\n?$/)?.[1] ?? '';
  return [...command.matchAll(/\bput -O "[^"]+" "([^"]+)"/g)].map((match) => match[1]);
}

test('full-site SSH deploy transfers only selected public files and never deletes', (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  const result = deploy(fixture, ['--full-site'], 'rsync');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.capturedFiles, fixture.publicFiles);
  assert.equal(result.capturedArgs.includes('--delete'), false);
  for (const file of fixture.internalFiles) {
    assert.equal(result.capturedFiles.includes(file), false, `${file} must stay private`);
  }
});

test('full-site FTPS transfers the same selected public files additively', (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  const result = deploy(fixture, ['--full-site', '--force-ftps'], 'lftp');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(lftpPutFiles(result.capturedArgs), fixture.publicFiles);
  assert.equal(result.capturedArgs.includes('--delete'), false);
  assert.match(result.capturedArgs, /set cmd:fail-exit true;/);
  assert.match(result.capturedArgs, /mkdir -p "\/public_html\/notes\/assets" \|\| echo "Directory creation skipped; upload will verify destination";/);
  assert.doesNotMatch(result.capturedArgs, /put -O "[^"]+" "[^"]+" \|\|/);
  for (const file of fixture.internalFiles) {
    assert.equal(result.capturedArgs.includes(file), false, `${file} must stay private`);
  }
});

test('FTPS put failures propagate as a failed deploy', (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  const result = deploy(fixture, ['--target-file', 'notes/first-note.html', '--force-ftps'], 'lftp', {
    FAKE_LFTP_EXIT: '23',
  });

  assert.equal(result.status, 23);
  assert.match(result.capturedArgs, /set cmd:fail-exit true;/);
});

test('changed-file mode deploys changed public files and approved assets only', (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: fixture.root });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: fixture.root });
  execFileSync('git', ['config', 'user.name', 'Deploy fixture'], { cwd: fixture.root });
  execFileSync('git', ['add', '.'], { cwd: fixture.root });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: fixture.root });
  fs.appendFileSync(path.join(fixture.root, 'robots.txt'), '# updated\n');
  fs.appendFileSync(path.join(fixture.root, 'content/draft.md'), '# updated\n');

  const result = deploy(fixture, [], 'rsync');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.capturedFiles, [
    'robots.txt',
    'css/site.css',
    'js/site.js',
  ]);
  assert.equal(result.capturedArgs.includes('--delete'), false);
  assert.equal(result.capturedFiles.includes('content/draft.md'), false);
});

test('single-file mode rejects traversal and excluded repository files', (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

  for (const target of ['../outside.html', 'content/draft.md', 'package.json']) {
    const result = deploy(fixture, ['--target-file', target], 'rsync');
    assert.notEqual(result.status, 0, `${target} must be rejected`);
    assert.match(result.stderr, /public|invalid|not found/i);
    assert.equal(result.capturedArgs, '');
  }
});

test('single-file mode rejects a public-looking path through a symlinked parent', (t) => {
  const fixture = makeFixture();
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }));
  fs.symlinkSync('../content', path.join(fixture.root, 'notes/alias'));

  const result = deploy(fixture, ['--target-file', 'notes/alias/private.html'], 'rsync');

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /public/i);
  assert.equal(result.capturedArgs, '');
});
