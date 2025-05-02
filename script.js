window.addEventListener('DOMContentLoaded', () => {
    const randomImage = document.querySelector('.random-image');
    const animeWindow = document.querySelector('.anime-window');
  
    const localImages = [
      'images/anime/1.png',
      'images/anime/2.jpg',
    ];
  
    if (localImages.length > 0) {
      const randomIndex = Math.floor(Math.random() * localImages.length);
      randomImage.src = localImages[randomIndex];
    }
  
    // Preload
    localImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });

    /*
    const webamp = new Webamp({
      initialTracks: [
        {
          metaData: {
            artist: "Style Savvy 2008",
            title: "Apartment Theme"
          },
          url: "your-mp3-file.mp3" // Replace with your MP3 URL
        }
      ],
      initialSkin: {
        url: "https://skins.webamp.org/skin/d632abee67ceb6878aa5ba3770bb7894/Tenchi Muyo - Aeka.wsz/"
      }
    });
    
    webamp.renderWhenReady(document.getElementById("winamp"));
    */
    
  });
  