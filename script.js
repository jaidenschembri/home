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
  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
  });

  