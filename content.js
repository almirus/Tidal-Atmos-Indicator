
// Вставляем файл injected.js в страницу
(function injectExternalScript() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.js"); // это ключевой момент!
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
})();
let token = null;
window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data.type === "TIDAL_AUTH_TOKEN") {
        if (event.data.token) token = event.data.token;
    }
});

console.log('Tidal Atmos Extension Loaded');
window.addEventListener('load', function () {

    let albumItems = [];
    const searchAtmosAlbum = (albumName) => {
        const searchUrl = `https://listen.tidal.com/v2/search/?includeContributors=true&includeDidYouMean=true&limit=50&query=${encodeURIComponent(albumName)}&supportsUserData=true&types=ALBUMS%2CTRACKS&countryCode=AR&locale=en_US&deviceType=BROWSER`;
        return fetch(searchUrl, {
            method: "GET",
            credentials: "include",
            headers: {
                Authorization: token
            }
        }).then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        }).then(data => {
            console.log(data);
            return data?.albums?.items?.filter(item => item?.mediaMetadata?.tags.includes('DOLBY_ATMOS'));
        }).catch(error => {
            console.error('Error fetching Atmos albums:', error);
        });
    }
    const processTrack = (trackElement) => {
        console.log(trackElement);
        console.log(albumItems);
        albumItems.forEach((item) => {
            const trackId = item?.item?.id;
            if (trackId == trackElement.getAttribute('data-id')) {
                trackElement.style.display = 'contents';
                if (item?.item?.mediaMetadata?.tags.includes('DOLBY_ATMOS')) {
                    const dolbyImg = document.createElement('img');
                    dolbyImg.alt = item?.item?.popularity;
                    dolbyImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAYAAADkmO9VAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCA1LjEuN4vW9zkAAAC2ZVhJZklJKgAIAAAABQAaAQUAAQAAAEoAAAAbAQUAAQAAAFIAAAAoAQMAAQAAAAIAAAAxAQIAEAAAAFoAAABphwQAAQAAAGoAAAAAAAAAYAAAAAEAAABgAAAAAQAAAFBhaW50Lk5FVCA1LjEuNwADAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAWgBAABAAAAlAAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAAAlR56NozS1xQAAAhVJREFUOE+dlE+L2kAYh3+va6ISxWqLWNhVb6WX0pMe6qn9CoVC8VL0VETw6BcpvZQFC4UevHl0KbrWQ09ShNI/FEpkm4O20ZgmOyaZHtZJE1kWtg/kMDO/ed7JTDIEAJzzBIB7ABQAHNeDAJgAPhKRRbgQPgFwdz95TT4R0dvIbnWHnudhuVx+22w2quu6Hi4KXfoAAGMMuq5rmqb9cF0XAA4554nIzs4dx8FwODxNpVKv5vP5sWVZPwPVQ+i6/ns6nb7JZDIvx+PxO8dxILZKCEmSJK9arZoAUCqV1Nls1rUsa0lEvoiIsF6vjV6v97pSqXwBgHQ6HQ1mhBBExHO5nCPa5XLZWiwWJ7vqAIDtdgtVVU8ajcYv0Se2QOALL2MwGHxnjBliBbZt/+n3+1/3c0GuFNbrdde2bX+JjLHzTqdzHk6FuVLYarUoFov5GUmSorVaLRpOhQkJGWP/dhdAs9m8Lcty2vM8cM4Rj8dT7Xb7KJjZx/9sGGMHk8nkRmCM8vn8Q0mSQEQgIsiyjGKx+AiALEKRSPgl/RbnHLqucwAYjUZJwzAeJ5PJohgXB5PNZvOapj3tdrs3AcA0TSd40rT7U567rps6Ozv7oCjKgaIod2RZTvqpgFBgmiZbrVafbdt2C4XC/Wg0agB4QZzzCIBnAI4456GJocp7QkFgjgrgWFwOtwA8AJD4z9vGAvCeiBZ/AT+f/DTWNCbEAAAAAElFTkSuQmCC';
                    dolbyImg.style.padding = '0 2px';
                    //dolbyImg.style.position = 'relative';
                    trackElement.appendChild(dolbyImg);
                }
                if (item?.item?.mediaMetadata?.tags.includes('HIRES_LOSSLESS')) {
                    const hiResImg = document.createElement('img');
                    hiResImg.alt = item?.item?.popularity;
                    hiResImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAUCAYAAADoZO9yAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCA1LjEuN4vW9zkAAAC2ZVhJZklJKgAIAAAABQAaAQUAAQAAAEoAAAAbAQUAAQAAAFIAAAAoAQMAAQAAAAIAAAAxAQIAEAAAAFoAAABphwQAAQAAAGoAAAAAAAAAYAAAAAEAAABgAAAAAQAAAFBhaW50Lk5FVCA1LjEuNwADAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAWgBAABAAAAlAAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAAAlR56NozS1xQAABB5JREFUSEudlk1oXFUUx3/n3pl585GaTpOmadN8aDQp2NaIhLQbWzClC20XkVqwoOAHLsSNGxdduHeroCCCghTtxkWkSotSdCF+UVFKbbNoAklrm6SdpMl8vY/jYt5M3rzMBPHPvDcz955z//97zrmHK4TIZhLHElYuZtKWVFIQAYXwFYOAxMdiaOWmCq6nlMsBnq9n1ovuufqcAHTlnUlruJR2zIZT4xVDqKCdkIZLK98QIlBxFc/X08v3KucB7I7tzrNOSr51kkYVROoMrRZqx/4/kLCiRjiVStmZUtn/y3ZuS95IJQUNaRpCWiFMScMkKnYrv1YQxFpRlOcVmZfBPRnVMH+EQtqlJSqync1/ERQ1EYHCqo9pu1aLBTcFoCk8m1Gfjj9RqEImbZCBPRmtR4NQoTVwcyEA9QGhd6dl+YHilj3A0L87gbVwt6AU1zxA2N2TwEnC7IIPBJCyUAXwIWkZ6jEEEZ76TwnFmDp5FDfnfc6+nufa9AgXPx5kdDDJKyc7mbkwyuVPh8hmLLPzPi8ez/H7+UeZ/mCAvp4Esws+H73by7XpEd6c6uS9t3fy99cjvPNSntmFAEIB8SyIgFHdqA8aRkq+09Lfm2J8f47Rh9NMHupgeCDN3l0OggCGQ090MLYvy/iBHEfHs4By+dd1Mo7hjRe6OXV8O8WS8t0va/R0S40n+kSw0TjqUABBRFi852EMHB7L8fhwmpm5Kn6gPCgFnDiaZv9jGW4tuVTdgCf3ZSCV4IsLa3w+fZ/hgRS5jOH9c0tcmfFwktGwhyoiYhpCROopqsm1AmvFgFt3PI481cG2DsuNuTIAhaIyNppmb0+KqzNlCqs+B0ayTD3tAEpfbwJjIO0Y+nYl8Mthc2hoiZdsmxoBMAasFa5cL7FzR4LF+x6F1QBjYGw4ycTBDnZ1WyYOZnmk32FoT5KJA1neOpPnxJFOfvhtndnbLq9OdTE1mWN1XVuetHpQNqcmtLq34nF70eWnP9b580aR739+wN1ll/l/qvR2WbblDN/8uEL+8FVePjvH9dky+YcSHB3PsXCnyodfLvHZV0tUKgHPTORYWdFYWYSFUvsg/bsz2tSoFKzRsMoDSBpw/VCzAQK68pbl+x4Ag30JFgtKcb1uAxCwvTNBYVXDFmAZ6jP4USWRE6IqtT4SmQ7nYyXdQDyHdbv4eIjYcFO5NniEqquY1kvEEtlAGM4mAa3s2g8T26YIlMoBpuK22z1bE4WLtCp0iGkOKaJboLayVqqK5+trpurqc56niDTno5mkHVscW2wqJkwEdX3E9fRMseR+IgDdeWfSGLmUdmrdL168kX/hd82gbre5rrYWLgKVaoDn6enlQvU8UY9sJnnMWi5mnNpV0UQO9oYYbSJpL6Q1VKEauSoWS17jqvgv5XKc7+bHRwwAAAAASUVORK5CYII=';
                    hiResImg.style.padding = '0 2px';
                    //hiResImg.style.position = 'fixed';
                    trackElement.appendChild(hiResImg);
                }
            }
        });
    }
    const processElement = (element, albumId) => {
        let genAlbumId = albumId || element.getAttribute('data-test-element-id') || element.getAttribute('data-test').split('album-card-')[1];
        console.log(`Processing element with albumId: ${genAlbumId}`);
        if (!genAlbumId) {
            console.error('Album ID not found');
            return;
        }
        fetch(`https://listen.tidal.com/v1/pages/album?albumId=${genAlbumId}&countryCode=AR&locale=en_US&deviceType=BROWSER`, {
            method: "GET",
            credentials: "include",
            headers: {
                Authorization: token
            }
        }).then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        }).then(data => {
            const tags = data?.rows?.[0]?.modules?.[0]?.album?.mediaMetadata?.tags || [];
            const video = data?.rows?.[0]?.modules?.[0]?.album?.numberOfVideos;
            if (albumId) albumItems = data?.rows?.[1]?.modules?.[0]?.pagedList?.items;
            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'tags-container';
            tagsDiv.style.position = 'absolute';
            tagsDiv.style.top = '10px';
            tagsDiv.style.left = '10px';
            tagsDiv.style.background = 'rgba(0, 0, 0, 0.7)';
            tagsDiv.style.color = '#fff';
            tagsDiv.style.padding = '5px';
            tagsDiv.style.borderRadius = '3px';
            tagsDiv.style.zIndex = '10';
            tagsDiv.style.fontSize = '12px';
            tagsDiv.innerHTML = tags.length > 0 ? tags.join('<br>') : (video > 0 ? 'Video' : 'No tags');
            tagsDiv.title = data?.rows?.[0]?.modules?.[0]?.album?.popularity;
            element.style.position = 'relative';
            if (albumId) {
                let albums = searchAtmosAlbum(data?.rows?.[0]?.modules?.[0]?.album?.artists?.[0].name + "-" + data?.rows?.[0]?.modules?.[0]?.album?.title)
                    .then(albums => {
                        const albumDiv = document.createElement('div');
                        albumDiv.style = "position: absolute; bottom: 10px; left: 10px; background: rgba(0, 0, 0, 0.5); color: #fff; padding: 5px; border-radius: 3px; z-index: 10; font-size: 11px;";
                        albums.forEach(album => {
                            const albumLink = document.createElement('a');
                            albumLink.href = `https://listen.tidal.com/album/${album.id}`;
                            albumLink.textContent = album.title + " " + album.releaseDate.substring(0, 4);
                            albumLink.title = 'Dolby Atmos';
                            albumLink.style.display = 'block';
                            if (album.id != albumId) albumDiv.appendChild(albumLink);

                        });
                        element.appendChild(albumDiv);
                    });
            }
            element.querySelector('button').remove();
            element.appendChild(tagsDiv);
        }).catch(error => {
            console.error(`Error fetching tags for album ${genAlbumId}:`, error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'tags-container';
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = '10px';
            errorDiv.style.left = '10px';
            errorDiv.style.background = 'rgba(0, 0, 0, 0.7)';
            errorDiv.style.color = '#fff';
            errorDiv.style.padding = '5px';
            errorDiv.style.borderRadius = '3px';
            errorDiv.style.zIndex = '10';
            errorDiv.style.fontSize = '12px';
            errorDiv.textContent = 'Error loading tags';
            element.style.position = 'relative';
            element.appendChild(errorDiv);
        });
    };

    const getAlbumIdFromUrl = () => {
        const match = window.location.pathname.match(/\/album\/(\d+)/);
        return match ? match[1] : null;
    };
    const selectorAlbumArt = 'div[class^="_coverArtContainer_"]';
    const selectorAlbumsArt = 'article[data-test="grid-item-album"][data-test-element-id]';
    const selectorAlbumsImg = 'div[data-test^="album-card-"]';
    const selectorTrack = 'span[data-id]';

    // Наблюдаем за новыми элементами (для React-приложения)
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        // Проверяем сам узел
                        if (node.matches(selectorAlbumsArt)) {
                            processElement(node);
                        }
                        if (node.matches(selectorAlbumArt)) {
                            processElement(node, getAlbumIdFromUrl());
                        }
                        if (node.matches(selectorTrack)) {
                            processTrack(node);
                        }
                        // Проверяем дочерние элементы
                        node.querySelectorAll(selectorAlbumsArt).forEach(div => {
                            processElement(div, null);
                        });
                        node.querySelectorAll(selectorAlbumsImg).forEach(div => {
                            processElement(div, null);
                        });
                        node.querySelectorAll(selectorAlbumArt).forEach(div => {
                            processElement(div, getAlbumIdFromUrl());
                        });
                        node.querySelectorAll(selectorTrack).forEach(div => {
                            processTrack(div);
                        });
                    }
                });
            }
        });
    });
    // Настраиваем наблюдатель
    observer.observe(document.body, {childList: true, subtree: true});

});
