// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});

// Toggle hidden blog posts with smooth animation
document.getElementById('view-more-btn').addEventListener('click', function () {
  const hiddenBlogs = document.querySelector('.hidden-blogs');
  const viewMoreBtn = document.getElementById('view-more-btn');

  // Toggle visibility
  hiddenBlogs.classList.toggle('visible');

  // Change button text
  if (hiddenBlogs.classList.contains('visible')) {
    viewMoreBtn.textContent = 'Show Less';
  } else {
    viewMoreBtn.textContent = 'View More';
    // Scroll to the top of the blog section
    document.getElementById('blog').scrollIntoView({ behavior: 'smooth' });
  }
});