document.addEventListener('DOMContentLoaded', function() {
  // 获取用于显示文章的容器
  const container = document.getElementById('history-posts');
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

      // 获取今天的日期
      const today = new Date();
      const currentMonth = today.getMonth() + 1; // getMonth() 返回 0-11
      const currentDay = today.getDate();
      const currentYear = today.getFullYear();

      // 筛选出历史上的今天发布的文章
      const matchedPosts = posts.filter(post => {
        const postDate = new Date(post.date);
        const postMonth = postDate.getMonth() + 1;
        const postDay = postDate.getDate();
        const postYear = postDate.getFullYear();
        // 月、日相同，但年份不同
        return postMonth === currentMonth && postDay === currentDay && postYear !== currentYear;
      });

      // 如果找到了匹配的文章
      if (matchedPosts.length > 0) {
        // 按年份倒序排序（最近的年份在前）
        matchedPosts.sort((a, b) => new Date(b.date).getFullYear() - new Date(a.date).getFullYear());

        // 生成所有匹配文章的 HTML 列表
        const listItems = matchedPosts.map(post => {
          const date = new Date(post.date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          return `<li><span class="date">${formattedDate}</span><a href="${prefix + post.path}" title="${post.title}">${post.title}</a></li>`;
        }).join('');

        const html = `
          <p>在历史上的今天，我发布了：</p>
          <ul class="listing">
            ${listItems}
          </ul>
        `;
        container.innerHTML = html;
      } else {
        // 如果没有找到
        container.innerHTML = '<p>历史上的今天没有发布文章。</p>';
      }
    })
    .catch(error => {
      console.error('获取历史文章数据失败:', error);
      container.innerHTML = '<p>加载历史上的今天数据失败。</p>';
    });
});