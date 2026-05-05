(function () {
  'use strict';

  var configEl = document.getElementById('section-comments-config');
  if (!configEl) return;

  var config;
  try {
    config = JSON.parse(configEl.textContent || '{}');
  } catch (error) {
    console.error('[section-comments] Invalid config:', error);
    return;
  }

  if (config.mode !== 'daily') return;

  var state = {
    initialized: false,
    activeInstance: null,
    activeTarget: null,
    drawer: null,
    drawerTitle: null,
    drawerBody: null
  };

  function normalizePath(value) {
    var path = value || window.location.pathname;
    try {
      path = new URL(path, window.location.origin).pathname;
    } catch (error) {
      path = window.location.pathname;
    }
    return path.replace(/\/index\.html$/, '/');
  }

  function normalizeServerURL(value) {
    return String(value || '').trim().replace(/\/$/, '');
  }

  function isConfiguredServer(serverURL) {
    return Boolean(serverURL) && serverURL.indexOf('your-waline-url') === -1;
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function parseDailyHeading(text) {
    var match = String(text || '').match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})(?:\s*[日号])?(?:\s*[—\-–~至到]\s*(\d{1,2})\s*[日号]?)?/);
    if (!match) return null;

    var year = match[1];
    var month = pad(match[2]);
    var day = pad(match[3]);
    var endDay = match[4] ? pad(match[4]) : '';
    var slug = 'day-' + year + '-' + month + '-' + day + (endDay ? '-' + endDay : '');

    return {
      slug: slug,
      label: year + '年' + Number(month) + '月' + Number(day) + '日' + (endDay ? '-' + Number(endDay) + '日' : '')
    };
  }

  function getContent() {
    return document.querySelector('.post-content');
  }

  function collectDailyHeadings(content) {
    return Array.prototype.slice.call(content.querySelectorAll('h2, h3, h4')).map(function (heading) {
      var daily = parseDailyHeading(heading.textContent);
      return daily ? { heading: heading, daily: daily } : null;
    }).filter(Boolean);
  }

  function createTrigger(item, commentPath) {
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'section-comment-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('data-comment-path', commentPath);
    trigger.innerHTML = '<i class="fa fa-comment-o" aria-hidden="true"></i><span>评论</span><span class="section-comment-count" data-path="' + commentPath + '"></span>';
    trigger.addEventListener('click', function () {
      toggleComments(item, trigger, commentPath);
    });
    return trigger;
  }

  function createInlineHost(commentPath) {
    var host = document.createElement('div');
    host.className = 'section-comment-inline';
    host.setAttribute('data-comment-host', commentPath);
    return host;
  }

  function insertInlineHost(content, host, item, nextItem) {
    if (nextItem && nextItem.heading.parentNode) {
      nextItem.heading.parentNode.insertBefore(host, nextItem.heading);
      return;
    }
    (item.heading.parentNode || content).appendChild(host);
  }

  function ensureDrawer() {
    if (state.drawer) return state.drawer;

    var drawer = document.createElement('aside');
    drawer.className = 'section-comment-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = [
      '<div class="section-comment-drawer-head">',
      '  <div>',
      '    <div class="section-comment-drawer-kicker">按天评论</div>',
      '    <h2 class="section-comment-drawer-title"></h2>',
      '  </div>',
      '  <button class="section-comment-drawer-close" type="button" aria-label="关闭评论"><i class="fa fa-times" aria-hidden="true"></i></button>',
      '</div>',
      '<div class="section-comment-drawer-body"></div>'
    ].join('');

    document.body.appendChild(drawer);
    state.drawer = drawer;
    state.drawerTitle = drawer.querySelector('.section-comment-drawer-title');
    state.drawerBody = drawer.querySelector('.section-comment-drawer-body');
    drawer.querySelector('.section-comment-drawer-close').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeDrawer();
    });

    return drawer;
  }

  function isDesktop() {
    return window.matchMedia('(min-width: 900px)').matches;
  }

  function destroyActiveInstance() {
    if (state.activeInstance && typeof state.activeInstance.destroy === 'function') {
      state.activeInstance.destroy();
    }
    state.activeInstance = null;
    state.activeTarget = null;
  }

  function resetTriggers() {
    document.querySelectorAll('.section-comment-trigger[aria-expanded="true"]').forEach(function (button) {
      button.setAttribute('aria-expanded', 'false');
    });
  }

  function closeInlineHosts() {
    document.querySelectorAll('.section-comment-inline.is-open').forEach(function (host) {
      host.classList.remove('is-open');
      host.innerHTML = '';
    });
  }

  function closeDrawer() {
    if (!state.drawer) return;
    state.drawer.classList.remove('is-open');
    state.drawer.setAttribute('aria-hidden', 'true');
    resetTriggers();
  }

  function showSetupNotice(target) {
    target.innerHTML = '<div class="section-comment-notice">评论服务还没有配置。部署 Waline 后，在主题配置里填写 <code>waline.serverURL</code> 即可启用留言。</div>';
  }

  function mountWaline(target, commentPath) {
    var serverURL = normalizeServerURL(config.serverURL);

    if (!isConfiguredServer(serverURL)) {
      destroyActiveInstance();
      showSetupNotice(target);
      return;
    }

    if (!window.Waline || typeof window.Waline.init !== 'function') {
      target.innerHTML = '<div class="section-comment-notice">评论组件加载失败，请刷新后重试。</div>';
      return;
    }

    if (state.activeTarget !== target) {
      destroyActiveInstance();
      target.innerHTML = '';
      state.activeTarget = target;
      state.activeInstance = window.Waline.init({
        el: target,
        serverURL: serverURL,
        path: commentPath,
        pageSize: Number(config.pageSize) || 10,
        wordLimit: Number(config.wordLimit) || 500,
        meta: Array.isArray(config.meta) ? config.meta : ['nick'],
        requiredMeta: Array.isArray(config.requiredMeta) ? config.requiredMeta : ['nick'],
        login: config.login || 'disable',
        lang: config.lang || 'zh-CN',
        placeholder: config.placeholder || '写下你的想法',
        noCopyright: config.noCopyright !== false,
        noRss: config.noRss !== false
      });
      return;
    }

    if (state.activeInstance && typeof state.activeInstance.update === 'function') {
      state.activeInstance.update({ path: commentPath });
    }
  }

  function toggleComments(item, trigger, commentPath) {
    var target;

    if (isDesktop()) {
      var drawer = ensureDrawer();
      closeInlineHosts();
      resetTriggers();
      state.drawerTitle.textContent = item.daily.label;
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      target = state.drawerBody;
    } else {
      closeDrawer();
      resetTriggers();
      var isOpen = item.host.classList.contains('is-open');
      closeInlineHosts();
      if (isOpen) {
        destroyActiveInstance();
        return;
      }
      item.host.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      target = item.host;
    }

    mountWaline(target, commentPath);
  }

  function updateCounts() {
    var serverURL = normalizeServerURL(config.serverURL);
    if (!isConfiguredServer(serverURL) || !window.Waline || typeof window.Waline.commentCount !== 'function') {
      return;
    }

    window.Waline.commentCount({
      serverURL: serverURL,
      selector: '.section-comment-count',
      path: normalizePath(config.pagePath),
      lang: config.lang || 'zh-CN'
    });
  }

  function initialize() {
    var content = getContent();
    if (!content || state.initialized) return false;

    var items = collectDailyHeadings(content);
    if (!items.length) return false;

    var basePath = normalizePath(config.pagePath);
    items.forEach(function (item, index) {
      if (item.heading.dataset.sectionComments === 'daily') return;

      var commentPath = basePath + '#' + item.daily.slug;
      var trigger = createTrigger(item, commentPath);
      var host = createInlineHost(commentPath);
      var nextItem = items[index + 1];

      item.heading.dataset.sectionComments = 'daily';
      item.heading.appendChild(trigger);
      item.host = host;
      insertInlineHost(content, host, item, nextItem);
    });

    state.initialized = true;
    updateCounts();
    return true;
  }

  function waitForContent() {
    if (initialize()) return;

    var content = getContent();
    if (!content || typeof MutationObserver === 'undefined') return;

    var observer = new MutationObserver(function () {
      if (initialize()) observer.disconnect();
    });
    observer.observe(content, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForContent);
  } else {
    waitForContent();
  }

  window.addEventListener('hexo-blog-decrypt', waitForContent);
})();
