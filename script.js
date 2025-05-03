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
              url: "mp3/caramelldansen.mp3"
            },
            {
              metaData: {
                artist: "Cascada",
                title: "Everytime We Touch"
              },
              url: "mp3/everytimewetouch.mp3"
            },
          ],
          
        initialSkin: {
            url: "skins/makemesad.wsz"
        }
    });

    webamp.renderWhenReady(document.getElementById("winamp"));
});