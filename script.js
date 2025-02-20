// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });

document.getElementById('view-more-btn').addEventListener('click', function () {
  const hiddenBlogs = document.querySelector('.hidden-blogs');
  const viewMoreBtn = document.getElementById('view-more-btn');

  // Toggle visibility of hidden blog posts
  if (hiddenBlogs.style.display === 'none' || hiddenBlogs.style.display === '') {
    hiddenBlogs.style.display = 'block'; // Show hidden blog posts
    viewMoreBtn.textContent = 'Show Less'; // Change button text
  } else {
    hiddenBlogs.style.display = 'none'; // Hide blog posts again
    viewMoreBtn.textContent = 'View More'; // Change button text back
  }
});