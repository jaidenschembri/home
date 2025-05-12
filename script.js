window.addEventListener('DOMContentLoaded', () => {

    const webamp = new Webamp({
        initialTracks: [
            {
              metaData: {
                artist: "Artist",
                title: "Jaiden theme song"
              },
              url: "mp3/Better Off Alone x Clarity sped up.mp3"
            },
            {
              metaData: {
                artist: "Caramellagirls",
                title: "Caramelldansen"
              },
              url: "mp3/caramelldanses.mp3"
            },
            {
              metaData: {
                artist: "Cascada",
                title: "Everytime We Touch"
              },
              url: "mp3/everytimewetouch.mp3"
            },
            {
              metaData: {
                artist: "carti",
                title: "OPM BABI"
              },
              url: "mp3/OPM BABI.mp3"
            },
          ],
          
        initialSkin: {
            url: "skins/As_Simple_As_It_Gets.wsz"
        }
    });

    webamp.renderWhenReady(document.getElementById("winamp"));
});

 const toggleBtn = document.getElementById('theme-toggle');

// Set light mode by default if not already saved
if (!localStorage.getItem('theme')) {
  document.body.classList.add('light-theme');
  localStorage.setItem('theme', 'light');
} else if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light-theme');
}

toggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('light-theme');
  const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
  localStorage.setItem('theme', theme);
});

  (function initStarfield() {
  const canvas = document.getElementById('space-bg');
  const ctx = canvas.getContext('2d');

  // === Adjustable Settings ===
  const STAR_COUNT = 150;
  const STAR_MIN_RADIUS = 0.5;
  const STAR_MAX_RADIUS = 1.5;
  const STAR_SPEED = 0.3;

  let stars = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * canvas.width / 2;
      stars.push({
        x: canvas.width / 2 + Math.cos(angle) * distance,
        y: canvas.height / 2 + Math.sin(angle) * distance,
        radius: Math.random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS) + STAR_MIN_RADIUS,
        angle,
        speed: Math.random() * STAR_SPEED + 0.1,
      });
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isLight = document.body.classList.contains('light-theme');
    ctx.fillStyle = isLight ? '#000000' : '#ffffff';

    stars.forEach(star => {
      star.x += Math.cos(star.angle) * star.speed;
      star.y += Math.sin(star.angle) * star.speed;

      // Reset if off screen
      if (
        star.x < 0 || star.x > canvas.width ||
        star.y < 0 || star.y > canvas.height
      ) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * canvas.width / 10;
        star.x = canvas.width / 2 + Math.cos(angle) * distance;
        star.y = canvas.height / 2 + Math.sin(angle) * distance;
        star.angle = angle;
      }

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    initStars();
  });

  resizeCanvas();
  initStars();
  animate();
})();

  