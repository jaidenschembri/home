window.addEventListener('DOMContentLoaded', () => {
    const randomImage = document.querySelector('.random-image');
  
    const localImages = [
      'images/anime/1.png',
      'images/anime/2.jpg',
    ];
  
    const randomIndex = Math.floor(Math.random() * localImages.length);
    randomImage.src = localImages[randomIndex];
  
    // Preload
    localImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  });
  