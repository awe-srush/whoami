// ── Comment system (localStorage-backed) ────────────────

function getCommentsKey() {
  return 'comments_' + location.pathname.replace(/\//g, '_');
}

function loadComments() {
  try {
    return JSON.parse(localStorage.getItem(getCommentsKey())) || [];
  } catch { return []; }
}

function saveComments(comments) {
  localStorage.setItem(getCommentsKey(), JSON.stringify(comments));
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function renderComments() {
  const thread = document.querySelector('.comment-thread');
  if (!thread) return;

  const comments = loadComments();
  const topLevel = comments.filter(c => !c.parentId);
  const noComments = document.querySelector('.no-comments');

  if (topLevel.length === 0) {
    thread.innerHTML = '';
    if (noComments) noComments.style.display = '';
    return;
  }

  if (noComments) noComments.style.display = 'none';

  function buildComment(comment) {
    const replies = comments.filter(c => c.parentId === comment.id);
    const liked = (JSON.parse(localStorage.getItem('liked_comments') || '[]')).includes(comment.id);

    let html = `<div class="comment" data-id="${comment.id}">
      <div class="comment-head">
        <div class="comment-avatar">${getInitials(comment.name)}</div>
        <span class="comment-author">${escapeHtml(comment.name)}</span>
        <span class="comment-time">${timeAgo(comment.ts)}</span>
      </div>
      <div class="comment-text">${escapeHtml(comment.text)}</div>
      <div class="comment-actions">
        <button class="like-btn${liked ? ' liked' : ''}" data-id="${comment.id}">&#9829; ${comment.likes || 0}</button>
        <button class="reply-btn" data-id="${comment.id}">Reply</button>
      </div>`;

    if (replies.length) {
      html += '<div class="comment-replies">';
      replies.forEach(r => { html += buildComment(r); });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  thread.innerHTML = topLevel.map(buildComment).join('');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function initComments() {
  const section = document.querySelector('.comments-section');
  if (!section) return;

  renderComments();

  // Post top-level comment
  const form = section.querySelector('.comment-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const text = form.querySelector('textarea').value.trim();
      const name = form.querySelector('input[name="name"]').value.trim();
      const email = form.querySelector('input[name="email"]').value.trim();
      if (!text || !name || !email) return;

      const comments = loadComments();
      comments.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name, email, text,
        ts: Date.now(),
        likes: 0,
        parentId: null
      });
      saveComments(comments);
      form.reset();
      renderComments();
    });
  }

  // Like and Reply delegation
  section.addEventListener('click', function(e) {
    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn) {
      const id = likeBtn.dataset.id;
      const liked = JSON.parse(localStorage.getItem('liked_comments') || '[]');
      const comments = loadComments();
      const comment = comments.find(c => c.id === id);
      if (!comment) return;

      if (liked.includes(id)) {
        comment.likes = Math.max(0, (comment.likes || 0) - 1);
        localStorage.setItem('liked_comments', JSON.stringify(liked.filter(l => l !== id)));
      } else {
        comment.likes = (comment.likes || 0) + 1;
        liked.push(id);
        localStorage.setItem('liked_comments', JSON.stringify(liked));
      }
      saveComments(comments);
      renderComments();
      return;
    }

    const replyBtn = e.target.closest('.reply-btn');
    if (replyBtn) {
      // Remove any existing reply forms
      section.querySelectorAll('.reply-form').forEach(f => f.remove());

      const commentEl = replyBtn.closest('.comment');
      const id = replyBtn.dataset.id;

      const replyForm = document.createElement('div');
      replyForm.className = 'reply-form';
      replyForm.innerHTML = `
        <textarea placeholder="Write a reply..." rows="3"></textarea>
        <div class="reply-form-fields">
          <input type="text" name="name" placeholder="Your name" required />
          <input type="email" name="email" placeholder="Your email" required />
        </div>
        <div class="reply-form-actions">
          <button class="reply-submit" type="button">Reply</button>
          <button class="reply-cancel" type="button">Cancel</button>
        </div>`;

      commentEl.querySelector('.comment-actions').after(replyForm);

      replyForm.querySelector('.reply-cancel').addEventListener('click', () => replyForm.remove());
      replyForm.querySelector('.reply-submit').addEventListener('click', () => {
        const text = replyForm.querySelector('textarea').value.trim();
        const name = replyForm.querySelector('input[name="name"]').value.trim();
        const email = replyForm.querySelector('input[name="email"]').value.trim();
        if (!text || !name || !email) return;

        const comments = loadComments();
        comments.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          name, email, text,
          ts: Date.now(),
          likes: 0,
          parentId: id
        });
        saveComments(comments);
        renderComments();
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', initComments);
