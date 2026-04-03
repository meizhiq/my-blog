document.addEventListener('DOMContentLoaded', function() {
  // 获取用于显示文章的容器
  const container = document.getElementById('random-posts');
  if (!container) return;

  // 使用 fetch API 获取 JSON 数据
  const prefix = '';
  fetch(`${prefix}/content.json`)
    .then(response => response.json())
    .then(data => {
      const posts = data.posts;
      if (!posts || posts.length === 0) {
        container.innerHTML = '<p>暂无文章数据。</p>';
        return;
      }

      // 随机选取一篇文章
      const randomIndex = Math.floor(Math.random() * posts.length);
      const randomPost = posts[randomIndex];

      // 生成 HTML
      const html = `
        <p>随便看看：<a href="${prefix + randomPost.path}" title="${randomPost.title}">${randomPost.title}</a></p>
      `;
      container.innerHTML = html;
    })
    .catch(error => {
      console.error('获取随机文章数据失败:', error);
      container.innerHTML = '<p>加载随机文章数据失败。</p>';
    });
});
