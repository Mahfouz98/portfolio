/* Ahmed Mahfouz — portfolio. Vanilla JS, no dependencies.
   The page is complete without this file; everything here is enhancement. */
(() => {
  'use strict';

  const REPO = 'Mahfouz98/portfolio';
  const USER = 'Mahfouz98';
  const API = 'https://api.github.com';

  const doc = document;
  const root = doc.documentElement;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => [...ctx.querySelectorAll(sel)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const touchFirst = matchMedia('(pointer: coarse)').matches; // on touch screens, don't pop the keyboard uninvited
  const text = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  root.classList.add('js');
  $('#year').textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------ nav */
  const nav = $('#nav');
  const burger = $('#burger');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 24);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  const setMenu = open => {
    nav.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('menu-open')));
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ------------------------------------------- current section + status line */
  const statusline = $('#statusline');
  const slPath = $('#slPath');
  statusline.hidden = false;
  root.classList.add('has-sl');

  const sections = $$('[data-path]');
  let currentPath = '~';
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      currentPath = entry.target.dataset.path;
      slPath.textContent = currentPath;
      $$('#navLinks a').forEach(a => {
        if (a.getAttribute('href') === '#' + entry.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -54% 0px' });
  sections.forEach(s => spy.observe(s));

  /* ---------------------------------------------------------- scroll reveal */
  const revealer = new IntersectionObserver(entries => {
    entries.filter(e => e.isIntersecting).forEach((entry, i) => {
      entry.target.style.setProperty('--d', Math.min(i * 70, 350) + 'ms');
      entry.target.classList.add('in');
      revealer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0.08 });
  $$('.reveal').forEach(el => revealer.observe(el));

  /* diagrams only animate while they are on screen */
  const liveDiagrams = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('live', entry.isIntersecting));
  }, { threshold: 0.25 });
  $$('.sys').forEach(el => liveDiagrams.observe(el));

  /* -------------------------------------------------- pointer-follow spotlight */
  if (finePointer && !reduced) {
    let px = 0, py = 0, queued = false;
    addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        root.style.setProperty('--mx', px + 'px');
        root.style.setProperty('--my', py + 'px');
        queued = false;
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------ hero prompt */
  const typeTarget = $('#typeCmd');
  const hint = $('#promptHint');
  const showHint = () => { hint.hidden = false; requestAnimationFrame(() => hint.classList.add('show')); };
  if (reduced) {
    showHint();
  } else {
    const word = typeTarget.textContent;
    typeTarget.textContent = '';
    let i = 0;
    const tick = () => {
      typeTarget.textContent = word.slice(0, ++i);
      if (i < word.length) setTimeout(tick, 80 + Math.random() * 110);
      else setTimeout(showHint, 700);
    };
    setTimeout(tick, 650);
  }

  /* ------------------------------------------------------------ small utils */
  const icon = id => {
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = doc.createElementNS('http://www.w3.org/2000/svg', 'use');
    svg.setAttribute('class', 'i');
    svg.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', '#' + id);
    svg.append(use);
    return svg;
  };
  const el = (tag, cls, content) => {
    const node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (content != null) node.textContent = content;
    return node;
  };
  const ago = date => {
    const s = (Date.now() - new Date(date)) / 1000;
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [unit, secs] of units) if (s >= secs) return rtf.format(-Math.floor(s / secs), unit);
    return 'just now';
  };
  const took = (a, b) => {
    const s = Math.max(0, Math.round((new Date(b) - new Date(a)) / 1000));
    return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's';
  };

  /* GitHub API with a small sessionStorage cache (unauthenticated: 60 req/hour per visitor) */
  const gh = async (path, slim, ttl = 300) => {
    const key = 'gh:' + path;
    try {
      const hit = JSON.parse(sessionStorage.getItem(key));
      if (hit && Date.now() - hit.t < ttl * 1000) return hit.d;
    } catch { /* storage unavailable or empty */ }
    const res = await fetch(API + path);
    if (!res.ok) throw new Error('GitHub API responded ' + res.status);
    const d = slim(await res.json());
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch { /* ignore */ }
    return d;
  };

  /* ---------------------------------------------- live pipeline (hero panel) */
  let pipeline = null; // shared with the console's `git log -1`

  const stateOf = r => {
    if (r.status !== 'completed') return 'run';
    if (r.conclusion === 'success') return 'ok';
    if (r.conclusion === 'skipped' || r.conclusion === 'neutral') return 'skip';
    return 'fail';
  };

  const loadPipeline = async () => {
    const runs = await gh(`/repos/${REPO}/actions/runs?per_page=8`, d => d.workflow_runs
      .filter(r => r.head_branch === 'main')
      .map(r => ({
        id: r.id, name: r.name, path: r.path, sha: r.head_sha, status: r.status, conclusion: r.conclusion,
        start: r.run_started_at, end: r.updated_at, url: r.html_url,
        msg: r.head_commit ? r.head_commit.message : '', when: r.head_commit ? r.head_commit.timestamp : r.created_at
      })));
    if (!runs.length) throw new Error('no runs yet');

    const head = runs[0];
    const same = runs.filter(r => r.sha === head.sha);
    const ci = same.find(r => /(^|\/)ci\.ya?ml$/.test(r.path));
    const pages = same.find(r => r.path.startsWith('dynamic/pages'));

    const stages = [{ name: 'commit', meta: head.sha.slice(0, 7), state: 'ok', url: `https://github.com/${REPO}/commit/${head.sha}` }];
    if (ci) {
      const jobs = await gh(`/repos/${REPO}/actions/runs/${ci.id}/jobs`, d => d.jobs.map(j => ({
        name: j.name, status: j.status, conclusion: j.conclusion, start: j.started_at, end: j.completed_at, url: j.html_url
      })), ci.status === 'completed' ? 300 : 30);
      jobs.forEach(j => {
        const state = stateOf(j);
        if (state === 'skip') return;
        stages.push({ name: j.name, meta: j.end ? took(j.start, j.end) : 'running', state, url: j.url });
      });
    }
    if (pages) {
      const state = stateOf(pages);
      stages.push({ name: 'deploy', meta: 'github pages · ' + (state === 'run' ? 'running' : took(pages.start, pages.end)), state, url: pages.url });
    }

    const overall = stages.some(s => s.state === 'fail') ? 'fail' : stages.some(s => s.state === 'run') ? 'run' : 'ok';
    const last = same.reduce((a, r) => (new Date(r.end) > new Date(a.end) ? r : a), head);
    return { stages, overall, sha: head.sha, msg: head.msg.split('\n')[0], when: head.when, finished: last.end, url: (pages || ci || head).url };
  };

  const renderPipeline = p => {
    const list = $('#stages');
    list.replaceChildren(...p.stages.map((s, i) => {
      const li = el('li', 'stage pop');
      li.dataset.state = s.state;
      li.style.animationDelay = (reduced ? 0 : i * 130) + 'ms';
      const ico = el('span', 'stage-ico');
      ico.setAttribute('aria-hidden', 'true');
      if (s.state === 'ok') ico.append(icon('i-check'));
      if (s.state === 'fail') ico.append(icon('i-x'));
      const name = el('a', 'stage-name', s.name);
      name.href = s.url; name.target = '_blank'; name.rel = 'noopener';
      name.title = `${s.name}: ${s.state === 'ok' ? 'passed' : s.state === 'run' ? 'in progress' : 'failed'}`;
      li.append(ico, name, el('span', 'stage-meta', s.meta));
      return li;
    }));

    const label = { ok: 'live', run: 'deploying', fail: 'checks failed' }[p.overall];
    const chip = $('#deployState');
    chip.dataset.state = p.overall;
    chip.textContent = label;

    $('#deployMeta').textContent = `main@${p.sha.slice(0, 7)} · ${p.overall === 'run' ? 'started' : 'shipped'} ${ago(p.finished)}`;
    const link = $('#deployLink');
    link.href = p.url;
    link.firstChild.textContent = 'view run ';

    const sl = $('#slDeploy');
    sl.hidden = false;
    sl.dataset.state = p.overall;
    sl.textContent = `main@${p.sha.slice(0, 7)} ${label}`;
    sl.href = p.url;
    sl.title = 'Live pipeline status from the GitHub API';
  };

  loadPipeline()
    .then(p => { pipeline = p; renderPipeline(p); })
    .catch(() => { $('#deployMeta').textContent = 'Live status is unavailable right now.'; });

  /* --------------------------------------------------------- repo star counts */
  gh(`/users/${USER}/repos?per_page=100`, d => Object.fromEntries(d.map(r => [r.name, { stars: r.stargazers_count }])), 900)
    .then(repos => {
      $$('[data-repo]').forEach(card => {
        const info = repos[card.dataset.repo];
        const badge = $('[data-stars]', card);
        if (!info || !badge) return;
        badge.hidden = info.stars < 1;
        badge.lastElementChild.textContent = info.stars;
        badge.title = `${info.stars} GitHub stars`;
      });
    })
    .catch(() => { /* keep the static numbers */ });

  /* ------------------------------------------------------------ note filters */
  const filters = $('#filters');
  filters.hidden = false;
  filters.addEventListener('click', e => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    $$('.filter', filters).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    const cat = btn.dataset.filter;
    $$('.post').forEach(post => {
      post.hidden = cat !== 'all' && post.dataset.cat !== cat;
      post.classList.add('in');
    });
  });

  /* ------------------------------------------------------------ contact form */
  const form = $('#contactForm');
  const formStatus = $('#formStatus');
  const say = (message, state) => {
    formStatus.textContent = message;
    if (state) formStatus.dataset.state = state; else delete formStatus.dataset.state;
  };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (form.elements._gotcha.value) return; // bots fill the hidden field
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    say('sending…');
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      say('Delivered. I will get back to you soon.', 'ok');
    } catch {
      say('Could not send. ', 'fail');
      const alt = el('a', null, 'Message me on LinkedIn instead.');
      alt.href = 'https://www.linkedin.com/in/ahmed-mahfouzz/'; alt.target = '_blank'; alt.rel = 'noopener';
      formStatus.append(alt);
    }
    btn.disabled = false;
  });

  /* -------------------------------------------- real page weight in the footer */
  addEventListener('load', () => setTimeout(() => {
    const navEntry = performance.getEntriesByType('navigation')[0];
    if (!navEntry) return;
    const own = performance.getEntriesByType('resource').filter(r => r.name.startsWith(location.origin));
    const bytes = [navEntry, ...own].reduce((sum, r) => sum + (r.transferSize || r.encodedBodySize || 0), 0);
    if (!bytes) return;
    $('#perf').textContent = `This visit: ${own.length + 1} requests, ${Math.round(bytes / 1024)} kB, interactive in ${Math.round(navEntry.domInteractive)} ms.`;
  }, 0));

  /* ================================================================ console */
  const con = $('#console');
  const out = $('#consoleOut');
  const input = $('#consoleInput');
  const toggle = $('#consoleToggle');
  const PROMPT = 'ahmed@prod:~$';
  const history = [];
  let hIndex = 0;
  let greeted = false;

  const print = (content = '', cls = 'c-out') => {
    const line = el('div', cls);
    (Array.isArray(content) ? content : [content]).forEach(part => {
      if (typeof part === 'string') line.append(part);
      else {
        const a = el('a', null, part.label);
        a.href = part.href;
        if (/^https?:/.test(part.href)) { a.target = '_blank'; a.rel = 'noopener'; }
        line.append(a);
      }
    });
    out.append(line);
    return line;
  };
  const cols = () => Math.max(34, Math.floor((out.clientWidth - 32) / (parseFloat(getComputedStyle(out).fontSize) * 0.6)));
  const wrap = (str, width = Math.min(cols(), 84), indent = '') => {
    const lines = [];
    let line = indent;
    str.split(' ').forEach(word => {
      if ((line + word).length > width && line.trim()) { lines.push(line.trimEnd()); line = indent; }
      line += word + ' ';
    });
    if (line.trim()) lines.push(line.trimEnd());
    return lines;
  };
  const table = (head, rows) => {
    const widths = head.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
    const fmt = r => r.map((c, i) => String(c).padEnd(widths[i])).join('   ').trimEnd();
    if (widths.reduce((sum, w) => sum + w + 3, -3) > cols()) { // narrow screen: one record per block
      const label = Math.max(...head.map(h => h.length)) + 2;
      rows.forEach((r, n) => {
        if (n) print();
        r.forEach((c, i) => wrap(String(c), cols() - label).forEach((l, k) => print((k ? '' : head[i].toLowerCase()).padEnd(label) + l, i ? 'c-out' : 'c-hi')));
      });
      return;
    }
    print(fmt(head), 'c-mute');
    rows.forEach(r => print(fmt(r)));
  };

  const SECTIONS = { about: 'about', work: 'work', career: 'career', stack: 'stack', 'open-source': 'projects', 'field-notes': 'blog', contact: 'contact' };
  const LINKS = {
    resume: 'resume.pdf',
    github: 'https://github.com/' + USER,
    linkedin: 'https://www.linkedin.com/in/ahmed-mahfouzz/',
    source: 'https://github.com/' + REPO
  };
  const systems = () => $$('.sys').map(s => ({
    name: s.dataset.name, kind: s.dataset.kind, title: text($('h3', s)), body: text($('.sys-body p', s)),
    tags: $$('.tags li', s).map(text)
  }));

  const commands = {
    help() {
      print('available commands', 'c-hi');
      [
        ['whoami', 'who this is'],
        ['cat about.md', 'the short version'],
        ['kubectl get deployments -n production', 'systems running in production'],
        ['kubectl describe deployment <name>', 'one system in detail'],
        ['helm history career', 'every role, newest first'],
        ['kubectl get skills', 'the stack'],
        ['gh repo list ' + USER, 'open source'],
        ['ls ~/field-notes', 'runbooks and study notes'],
        ['git log -1', "this site's last deploy, live"],
        ['ssh ahmed@contact', 'get in touch'],
        ['cd <section>, ls, open <resume|github|linkedin>', ''],
        ['clear, history, exit', '']
      ].forEach(([c, d]) => print(['  ' + c.padEnd(40) + ' ', d && '# ' + d].filter(Boolean).join(''), d ? 'c-out' : 'c-mute'));
      print('tab completes · ↑ ↓ walk history', 'c-mute');
    },
    whoami() {
      print('ahmed mahfouz', 'c-hi');
      print('devops engineer · cairo, egypt · rhcsa');
      print('kubernetes · gitops · ci/cd · ai infrastructure');
    },
    'cat about.md'() {
      $$('.about-text p').forEach((p, i) => {
        if (i) print();
        wrap(text(p)).forEach(l => print(l, i ? 'c-out' : 'c-hi'));
      });
    },
    'kubectl get deployments -n production'() {
      table(['NAME', 'KIND', 'STATUS', 'STACK'], systems().map(s => [s.name, s.kind.toLowerCase(), 'Running', s.tags.slice(0, 3).join(', ')]));
      print();
      print('details: kubectl describe deployment <name>', 'c-mute');
    },
    'helm history career'() {
      table(['REVISION', 'UPDATED', 'STATUS', 'CHART'], $$('.revs .rev').map(r => [
        text($('.rev-n', r)), text($('.rev-date', r)), r.dataset.status,
        text($('.rev-chart b', r)) + ' · ' + text($('.rev-chart', r)).replace(text($('.rev-chart b', r)), '').trim()
      ]));
    },
    'kubectl get skills'() {
      const rows = $$('.stack-row').map(r => [text($('dt', r)), $$('li', r).map(text).join(', ')]);
      const w = Math.max(...rows.map(r => r[0].length));
      print('CATEGORY'.padEnd(w) + '   TOOLS', 'c-mute');
      rows.forEach(([cat, tools]) => {
        wrap(tools, Math.max(30, Math.min(cols(), 110) - w - 3)).forEach((l, i) => print((i ? '' : cat).padEnd(w) + '   ' + l));
      });
    },
    ['gh repo list ' + USER]() {
      $$('.repo').forEach(r => {
        const stars = $('[data-stars]', r);
        const n = stars && !stars.hidden ? ` (${text(stars)} ${text(stars) === '1' ? 'star' : 'stars'})` : '';
        print([{ label: USER + '/' + r.dataset.repo, href: r.href }, n]);
        print('  ' + text($('h3', r)), 'c-mute');
      });
    },
    'ls ~/field-notes'() {
      const narrow = cols() < 70;
      $$('.post').forEach(p => print([narrow ? '' : `[${text($('.post-tag', p))}]`.padEnd(20), { label: text($('.post-main b', p)), href: $('a', p).href }]));
    },
    'git log -1'() {
      if (!pipeline) {
        print(['live status unavailable. see ', { label: 'the runs on GitHub', href: `https://github.com/${REPO}/actions` }], 'c-mute');
        return;
      }
      print(`commit ${pipeline.sha} (HEAD -> main, origin/main)`, 'c-hi');
      print('Date:   ' + new Date(pipeline.when).toUTCString());
      print();
      print('    ' + pipeline.msg);
      print();
      print(pipeline.stages.map(s => `${s.name} ${s.state === 'ok' ? 'ok' : s.state === 'run' ? '..' : 'FAILED'}`).join('  >  '),
        pipeline.overall === 'ok' ? 'c-ok' : pipeline.overall === 'run' ? 'c-hi' : 'c-err');
      print([{ label: 'view run', href: pipeline.url }]);
    },
    'ssh ahmed@contact'() {
      print('Connection to contact established.', 'c-ok');
      print(['linkedin  ', { label: 'linkedin.com/in/ahmed-mahfouzz', href: LINKS.linkedin }]);
      print(['github    ', { label: 'github.com/' + USER, href: LINKS.github }]);
      print('or use the form: jumping to ~/contact');
      go('contact');
    },
    ls() { print(Object.keys(SECTIONS).map(s => s + '/').join('  ') + '  resume.pdf'); },
    pwd() { print('/home/ahmed' + currentPath.slice(1)); },
    date() { print(new Date().toString()); },
    history() { history.forEach((h, i) => print(String(i + 1).padStart(4) + '  ' + h)); },
    clear() { out.replaceChildren(); },
    exit() { closeConsole(); }
  };
  const aliases = {
    '?': 'help', man: 'help', 'cat about': 'cat about.md', about: 'cat about.md',
    'helm history production': 'kubectl get deployments -n production',
    'kubectl get deployments': 'kubectl get deployments -n production',
    'kubectl get deploy': 'kubectl get deployments -n production',
    'kubectl get deploy -n production': 'kubectl get deployments -n production',
    'gh repo list': 'gh repo list ' + USER, 'git log --open-source': 'gh repo list ' + USER,
    'tail -f blog.log': 'ls ~/field-notes', 'ls field-notes': 'ls ~/field-notes', 'ls ~/field-notes/': 'ls ~/field-notes',
    'git log': 'git log -1', 'git status': 'git log -1', 'ls -la': 'ls', 'ls -l': 'ls', ll: 'ls',
    'helm history': 'helm history career', career: 'helm history career', skills: 'kubectl get skills',
    contact: 'ssh ahmed@contact', quit: 'exit', logout: 'exit', cls: 'clear'
  };

  const go = id => {
    const target = id ? doc.getElementById(id) : doc.body;
    if (!target) return false;
    if (matchMedia('(max-width: 700px)').matches) closeConsole();
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    return true;
  };

  const run = raw => {
    const cmd = raw.trim().replace(/\s+/g, ' ');
    const echo = print('', 'c-in');
    echo.append(el('span', null, PROMPT), ' ' + cmd);
    if (!cmd) return;
    if (history[history.length - 1] !== cmd) history.push(cmd);
    hIndex = history.length;

    const key = aliases[cmd.toLowerCase()] || Object.keys(commands).find(k => k.toLowerCase() === cmd.toLowerCase());
    const [bin, ...args] = cmd.split(' ');
    if (key) commands[key]();
    else if (bin === 'cd') {
      const dest = (args[0] || '~').replace(/^~\/?|\/$/g, '');
      if (!dest) { go(''); scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }
      else if (SECTIONS[dest]) go(SECTIONS[dest]);
      else print(`cd: ${args[0]}: No such file or directory`, 'c-err');
    } else if (bin === 'open' || bin === 'xdg-open') {
      const what = (args[0] || '').replace(/\.pdf$/, '');
      if (!LINKS[what]) { print('usage: open <resume|github|linkedin|source>', 'c-err'); return; }
      print('opening ' + LINKS[what], 'c-mute');
      const a = el('a');
      a.href = LINKS[what];
      if (what === 'resume') a.download = ''; else { a.target = '_blank'; a.rel = 'noopener'; }
      a.click();
    } else if (/^kubectl describe (deployment|deploy)( |\/)/.test(cmd)) {
      const name = cmd.split(/[ /]/).pop();
      const sys = systems().find(s => s.name === name);
      if (!sys) { print(`Error from server (NotFound): deployments.apps "${name}" not found`, 'c-err'); return; }
      print('Name:    ' + sys.name, 'c-hi');
      print('Kind:    ' + sys.kind);
      print('Status:  Running');
      print('Stack:   ' + sys.tags.join(', '));
      print();
      wrap(sys.title).forEach(l => print(l, 'c-hi'));
      wrap(sys.body).forEach(l => print(l));
    } else if (bin === 'kubectl' && args[0] === 'get') {
      print(`error: the server doesn't have a resource type "${args[1] || ''}"`, 'c-err');
      print('try: kubectl get deployments -n production, kubectl get skills', 'c-mute');
    } else if (bin === 'echo') print(args.join(' '));
    else if (bin === 'cat') print(args[0] === 'resume.pdf' ? 'cat: resume.pdf: binary file. try: open resume' : `cat: ${args[0] || ''}: No such file or directory`, 'c-err');
    else if (bin === 'sudo') print('ahmed is not in the sudoers file. This incident will be reported.', 'c-err');
    else if (bin === 'rm') print('rm: cannot remove production: Operation not permitted', 'c-err');
    else {
      print(`bash: ${bin}: command not found`, 'c-err');
      print("type 'help' to see what works here", 'c-mute');
    }
  };
  const exec = cmd => { run(cmd); out.scrollTop = out.scrollHeight; };

  const completions = () => [
    ...Object.keys(commands), ...Object.keys(SECTIONS).map(s => 'cd ' + s), ...Object.keys(LINKS).map(l => 'open ' + l),
    ...systems().map(s => 'kubectl describe deployment ' + s.name)
  ];
  const complete = () => {
    const v = input.value;
    if (!v) return;
    const hits = completions().filter(c => c.startsWith(v));
    if (!hits.length) return;
    if (hits.length === 1) { input.value = hits[0]; return; }
    let prefix = hits[0];
    hits.forEach(h => { while (!h.startsWith(prefix)) prefix = prefix.slice(0, -1); });
    if (prefix.length > v.length) input.value = prefix;
    else { hits.forEach(h => print('  ' + h, 'c-mute')); out.scrollTop = out.scrollHeight; }
  };

  function openConsole(cmd, fromKeyboard) {
    if (!greeted) {
      greeted = true;
      con.classList.add('open'); // must be laid out before we can measure its width
      wrap('Welcome. This is a small shell wired to the page you are reading.').forEach(l => print(l, 'c-hi'));
      wrap("Type 'help', press tab to complete, or pick a command below.").forEach(l => print(l, 'c-mute'));
      print();
    }
    con.classList.add('open');
    con.inert = false;
    root.classList.add('console-open');
    toggle.setAttribute('aria-expanded', 'true');
    setMenu(false);
    if (fromKeyboard || !touchFirst) input.focus({ preventScroll: true });
    if (cmd) exec(cmd);
  }
  function closeConsole() {
    if (!con.classList.contains('open')) return;
    con.classList.remove('open');
    con.inert = true;
    root.classList.remove('console-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (con.contains(doc.activeElement) || doc.activeElement === doc.body) toggle.focus({ preventScroll: true });
  }
  const isOpen = () => con.classList.contains('open');

  toggle.addEventListener('click', () => (isOpen() ? closeConsole() : openConsole()));
  $('#consoleClose').addEventListener('click', closeConsole);
  $('#consoleForm').addEventListener('submit', e => { e.preventDefault(); exec(input.value); input.value = ''; });
  out.addEventListener('click', () => { if (!touchFirst && !String(getSelection())) input.focus({ preventScroll: true }); });

  $$('[data-run]').forEach(btn => btn.addEventListener('click', () => {
    if (isOpen()) exec(btn.dataset.run); else openConsole(btn.dataset.run);
  }));

  input.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !e.shiftKey && input.value) { e.preventDefault(); complete(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (hIndex > 0) input.value = history[--hIndex]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); input.value = hIndex < history.length - 1 ? history[++hIndex] : (hIndex = history.length, ''); }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); commands.clear(); }
  });

  addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) { closeConsole(); return; }
    if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    const typingElsewhere = t !== input && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typingElsewhere) return;
    e.preventDefault();
    if (isOpen()) closeConsole(); else openConsole(null, true);
  });

  /* keep the full-screen mobile console above the on-screen keyboard */
  if (window.visualViewport) {
    const fit = () => root.style.setProperty('--vvh', visualViewport.height + 'px');
    visualViewport.addEventListener('resize', fit);
    fit();
  }
})();
