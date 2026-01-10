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
        if (!token) {
            console.warn('Token is null, cannot search for Atmos albums');
            return Promise.resolve([]);
        }
        const searchUrl = `https://listen.tidal.com/v2/search/?includeContributors=true&includeDidYouMean=true&limit=50&query=${encodeURIComponent(albumName)}&supportsUserData=true&types=ALBUMS%2CTRACKS&countryCode=AR&locale=en_US&deviceType=BROWSER`;
        return fetch(searchUrl, {
            method: "GET",
            headers: {
                Authorization: token
            }
        }).then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        }).then(data => {
            //console.log(data);
            return data?.albums?.items?.filter(item => item?.mediaMetadata?.tags.includes('DOLBY_ATMOS'));
        }).catch(error => {
            console.error('Error fetching Atmos albums:', error);
        });
    }

    // Функция для получения Atmos альбомов из "Other versions"
    const getAtmosAlbumsFromOtherVersions = (data) => {
        if (!data) {
            return [];
        }
        const otherVersions = data?.rows?.[2]?.modules?.[0]?.pagedList?.items;
        if (!otherVersions || !Array.isArray(otherVersions) || data?.rows?.[2]?.modules?.[0]?.title!='Other versions') {
            return [];
        }
        return otherVersions.filter(item => item?.mediaMetadata?.tags?.includes('DOLBY_ATMOS'));
    }

    // Функция для поиска информации об альбоме в Discogs API
    // Для получения токена: https://www.discogs.com/settings/developers
    // Замените YOUR_DISCOGS_TOKEN_HERE на ваш токен
    const searchDiscogsAlbum = (artistName, albumTitle, tidalYear) => {
        const searchQuery = `${artistName} ${albumTitle}`;
        let searchUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(searchQuery)}&type=release&per_page=5`;
        
        // Если передан год, добавляем его в параметры поиска
        if (tidalYear) {
            searchUrl += `&year=${tidalYear}`;
        }
        
        return fetch(searchUrl, {
            method: "GET",
            headers: {
                'User-Agent': 'TidalAtmosExtension/1.0',
                'Authorization': 'Discogs token=IiNYidApVniIGermIfXhJpdPIWKfONoFAuKPPwnG'
            }
        }).then(response => {
            if (!response.ok) {
                console.warn(`Discogs API error: ${response.status} - ${response.statusText}`);
                return null;
            }
            return response.json();
        }).then(data => {
            console.warn(`Discogs API result: ${data}`);
            if (data && data.results && data.results.length > 0) {
                //console.log('Discogs search results:', data);
                // Возвращаем первый результат (уже отфильтрованный по году если указан)
                return data.results[0];
            }
            return null;
        }).catch(error => {
            console.error('Error fetching Discogs album info:', error);
            return null;
        });
    }

    // Функция для получения детальной информации об альбоме из Discogs
    const getDiscogsAlbumDetails = (releaseId) => {
        const detailsUrl = `https://api.discogs.com/releases/${releaseId}`;
        
        return fetch(detailsUrl, {
            method: "GET",
            headers: {
                'User-Agent': 'TidalAtmosExtension/1.0',
                'Authorization': 'Discogs token=IiNYidApVniIGermIfXhJpdPIWKfONoFAuKPPwnG'
            }
        }).then(response => {
            if (!response.ok) {
                console.warn(`Discogs API error: ${response.status} - ${response.statusText}`);
                return null;
            }
            return response.json();
        }).then(data => {
            if (data) {
                console.log('Discogs album details:', data);
                return data;
            }
            return null;
        }).catch(error => {
            console.error('Error fetching Discogs album details:', error);
            return null;
        });
    }
    const processTrack = (trackElement) => {        
        // Проверяем, были ли уже добавлены иконки
        if (!trackElement || trackElement.querySelector('img[alt]')) {
            return;
        }        
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
        if (!token) {
            console.warn('Token is null, cannot process element');
            return;
        }
        let genAlbumId = albumId || element.getAttribute('data-test-element-id') || element.getAttribute('data-test').split('album-card-')[1];
        console.log(`Processing element with albumId: ${genAlbumId}`);
        if (!genAlbumId) {
            console.error('Album ID not found');
            return;
        }
        fetch(`https://listen.tidal.com/v1/pages/album?albumId=${genAlbumId}&countryCode=AR&locale=en_US&deviceType=BROWSER`, {
            method: "GET",
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
            const popularity = data?.rows?.[0]?.modules?.[0]?.album?.popularity;
            const releaseDate = data?.rows?.[0]?.modules?.[0]?.album?.streamStartDate;
            if (albumId) albumItems = data?.rows?.[1]?.modules?.[0]?.pagedList?.items;
            
            // Создаем div для популярности в правом верхнем углу
            if (popularity !== undefined && popularity !== null) {
                const popularityDiv = document.createElement('div');
                popularityDiv.className = 'popularity-container';
                popularityDiv.style.position = 'absolute';
                popularityDiv.style.top = '5px';
                popularityDiv.style.right = '5px';
                popularityDiv.style.background = 'rgba(0, 0, 0, 0.8)';
                popularityDiv.style.color = '#fff';
                popularityDiv.style.padding = '4px 8px';
                popularityDiv.style.borderRadius = '12px';
                popularityDiv.style.zIndex = '4';
                popularityDiv.style.fontSize = '10px';
                popularityDiv.style.fontWeight = 'bold';
                popularityDiv.style.display = 'flex';
                popularityDiv.style.alignItems = 'center';
                popularityDiv.style.gap = '4px';
                popularityDiv.title = "popularity";                
                // Эмодзи в зависимости от популярности
                let emoji = '💿';
                if (popularity >= 80) emoji = '🔥';
                else if (popularity >= 60) emoji = '💫';
                else if (popularity >= 40) emoji = '✨';
                else if (popularity >= 20) emoji = '💎';
                
                popularityDiv.innerHTML = `${emoji} ${popularity}`;
                element.appendChild(popularityDiv);
            }
            
            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'tags-container';
            tagsDiv.style.position = 'absolute';
            tagsDiv.style.top = '5px';
            tagsDiv.style.left = '5px';
            tagsDiv.style.background = 'rgba(0, 0, 0, 0.7)';
            tagsDiv.style.color = '#fff';
            tagsDiv.style.padding = '5px';
            tagsDiv.style.borderRadius = '12px';
            tagsDiv.style.zIndex = '4';
            tagsDiv.style.fontSize = '10px';
            tagsDiv.innerHTML = tags.length > 0 ? tags.join('<br>') : (video > 0 ? 'Video' : 'No tags');
            element.style.position = 'relative';
            if (albumId) {
                // Получаем Atmos альбомы из "Other versions"
                const otherVersionsAtmosAlbums = getAtmosAlbumsFromOtherVersions(data);
                
                searchAtmosAlbum(data?.rows?.[0]?.modules?.[0]?.album?.artists?.[0].name + "-" + data?.rows?.[0]?.modules?.[0]?.album?.title)
                    .then(albums => {
                        // Объединяем результаты из поиска и из "Other versions"
                        let allAtmosAlbums = [];
                        
                        // Добавляем альбомы из поиска
                        if (albums && albums.length > 0) {
                            const searchAlbums = albums.filter(album => album.id != albumId);
                            allAtmosAlbums = allAtmosAlbums.concat(searchAlbums);
                        }

                        // Добавляем альбомы из "Other versions"
                        if (otherVersionsAtmosAlbums && otherVersionsAtmosAlbums.length > 0) {
                            const otherVersionsAlbums = otherVersionsAtmosAlbums
                                
                                .filter(album => album && album.id != albumId);
                            allAtmosAlbums = allAtmosAlbums.concat(otherVersionsAlbums);
                        }
                        
                        // Убираем дубликаты по id
                        const uniqueAlbums = allAtmosAlbums.filter((album, index, self) => 
                            index === self.findIndex(a => a.id === album.id)
                        );
                        
                        if (uniqueAlbums.length > 0) {
                                // Ищем блок с названием альбома по более надежным селекторам
                                const titleContainer = document.querySelector('h2[data-test="title"]')?.closest('div') || 
                                                      document.querySelector('[data-test="title"]')?.closest('div') ||
                                                      document.querySelector('h2[class*="title"]')?.closest('div');
                                if (titleContainer) {
                                    const atmosDiv = document.createElement('div');
                                    atmosDiv.className = 'atmos-info';
                                    atmosDiv.style = "flex: 1; padding: 8px; background: rgba(0, 0, 0, 0.05); border-radius: 6px; border-left: 3px solid rgb(0, 127, 212);";
                                    
                                    const atmosTitle = document.createElement('div');
                                    atmosTitle.style = "font-size: 12px; font-weight: 600; color:rgb(0, 162, 212); margin-bottom: 4px;";
                                    atmosTitle.textContent = '🎧 Dolby Atmos альбомы:';
                                    atmosDiv.appendChild(atmosTitle);
                                    
                                    uniqueAlbums.forEach(album => {
                                        const albumLink = document.createElement('a');
                                        albumLink.href = `https://listen.tidal.com/album/${album.id}`;
                                        albumLink.textContent = album.title + " (" + (album?.streamStartDate?.substring(0, 4) || '') + ")";
                                        albumLink.title = 'Dolby Atmos';
                                        albumLink.style = "display: block; color: rgba(255, 255, 255, 0.8); text-decoration: none; font-size: 11px; padding: 2px 0;";
                                        albumLink.addEventListener('mouseenter', () => {
                                            albumLink.style.color = '#00d4aa';
                                        });
                                        albumLink.addEventListener('mouseleave', () => {
                                            albumLink.style.color = 'rgba(255, 255, 255, 0.8)';
                                        });
                                        atmosDiv.appendChild(albumLink);
                                    });
                                    
                                    // Создаем или находим контейнер для горизонтального размещения
                                    const metaContainer = titleContainer.querySelector('[data-test="grid-item-meta-item-count"]')?.closest('div') ||
                                                        titleContainer.querySelector('[data-test="meta-release-date"]')?.closest('div') ||
                                                        titleContainer.querySelector('span[class*="meta"]')?.closest('div');
                                    
                                    if (metaContainer) {
                                        let horizontalContainer = metaContainer.parentNode.querySelector('.music-info-container');
                                        if (!horizontalContainer) {
                                            horizontalContainer = document.createElement('div');
                                            horizontalContainer.className = 'music-info-container';
                                            horizontalContainer.style = "display: flex; margin-top: 8px; gap: 8px;";
                                            metaContainer.parentNode.insertBefore(horizontalContainer, metaContainer.nextSibling);
                                        }
                                        
                                        // Добавляем блок Dolby Atmos в контейнер
                                        horizontalContainer.appendChild(atmosDiv);
                                    } else {
                                        titleContainer.appendChild(atmosDiv);
                                    }
                                }
                        }
                    });
            }
            // Добавляем дату цифрового релиза рядом с годом релиза
            if (releaseDate && albumId) {
                setTimeout(() => {
                    addReleaseDateToPage(releaseDate);
                }, 500);
            }
            // Добавляем информацию о форматах треков
            if (albumItems) {
                setTimeout(() => {
                    addTrackInfo(albumItems);
                }, 500);
            }
            
            // Добавляем информацию Discogs для страницы альбома
            if (albumId && data?.rows?.[0]?.modules?.[0]?.album) {
                const album = data.rows[0].modules[0].album;
                const artistName = album.artists?.[0]?.name;
                const albumTitle = album.title;
                const tidalYear = releaseDate ? releaseDate.substring(0, 4) : null;
                
                if (artistName && albumTitle) {
                    searchDiscogsAlbum(artistName, albumTitle, tidalYear)
                        .then(discogsResult => {
                            if (discogsResult && discogsResult.id) {
                                return getDiscogsAlbumDetails(discogsResult.id);
                            }
                            return null;
                        })
                        .then(discogsDetails => {
                            if (discogsDetails) {
                                setTimeout(() => {
                                    addDiscogsInfoToPage(discogsDetails, album);
                                }, 1000);
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching Discogs info:', error);
                        });
                }
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

    const addTrackInfo = (albumItems) => {
        albumItems.forEach(item => {
            const trackId = item?.item?.id;
            const trackElement = document.querySelector(`span[data-id="${trackId}"]`);
            processTrack(trackElement);
        });
    };
    // Функция для нормализации текста (убирает диакритические знаки)
    const normalizeText = (text) => {
        if (!text) return '';
        return text
            .toLowerCase()
            .trim()
            .normalize('NFD') // Разлагает символы на базовые + диакритические знаки
            .replace(/[\u0300-\u036f]/g, '') // Убирает диакритические знаки
            .replace(/[^\w\s]/g, '') // Убирает все кроме букв, цифр и пробелов
            .replace(/\s+/g, ' '); // Заменяет множественные пробелы на одинарные
    };

    // Функция для добавления информации Discogs на страницу
    const addDiscogsInfoToPage = (discogsInfo, tidalAlbum) => {
        try {
            if (!discogsInfo || !tidalAlbum) return;
            
            // Проверяем соответствие исполнителя с нормализацией
            const tidalArtist = normalizeText(tidalAlbum.artists?.[0]?.name);
            const discogsArtist = normalizeText(discogsInfo.artists?.[0]?.name || discogsInfo.artist);
            
            // Проверяем соответствие года из элемента на странице
            const releaseDateElement = document.querySelector('span[data-test="meta-release-date"]');
            const tidalYear = releaseDateElement?.textContent?.match(/\d{4}/)?.[0];
            const discogsYear = discogsInfo.year?.toString() || 
                               discogsInfo.released?.substring(0, 4);
            
            // Если исполнитель не совпадает, не показываем блок
            if (!tidalArtist || !discogsArtist) {
                console.log('Discogs: Отсутствуют данные исполнителя', { tidalArtist, discogsArtist });
                return;
            }
            
            // Проверяем совпадение исполнителей (более гибкая проверка)
            const tidalWords = tidalArtist.split(' ');
            const discogsWords = discogsArtist.split(' ');
            
            // Ищем пересечение слов (хотя бы одно слово должно совпадать)
            const hasCommonWord = tidalWords.some(tidalWord => 
                discogsWords.some(discogsWord => 
                    tidalWord.length > 2 && discogsWord.length > 2 && 
                    (tidalWord.includes(discogsWord) || discogsWord.includes(tidalWord))
                )
            );
            
            if (!hasCommonWord) {
                console.log('Discogs: Исполнитель не совпадает', { 
                    tidalArtist, 
                    discogsArtist,
                    tidalWords,
                    discogsWords
                });
                return;
            }
            
/*             if (tidalYear && discogsYear && Math.abs(parseInt(tidalYear) - parseInt(discogsYear)) > 5) {
                console.log('Discogs: Год не совпадает', { tidalYear, discogsYear });
                return;
            } */
            
            // Ищем контейнер с мета-информацией
            const metaContainer = document.querySelector('[data-test="grid-item-meta-item-count"]')?.closest('div') ||
                                document.querySelector('[data-test="meta-release-date"]')?.closest('div') ||
                                document.querySelector('span[class*="meta"]')?.closest('div');
            
            if (metaContainer) {
                // Проверяем, не добавлена ли уже информация Discogs
                if (metaContainer.querySelector('.discogs-info')) return;
                
                const discogsDiv = document.createElement('div');
                discogsDiv.className = 'discogs-info';
                discogsDiv.style = "flex: 1; padding: 8px; background: rgba(0, 0, 0, 0.05); border-radius: 6px; border-left: 3px solid #ff6b35; margin-right: 8px;";
                
                const discogsTitle = document.createElement('a');
                discogsTitle.href = discogsInfo.uri || `https://www.discogs.com/release/${discogsInfo.id}`;
                discogsTitle.target = '_blank';
                discogsTitle.textContent = '💿 Discogs:';
                discogsTitle.style = "font-size: 12px; font-weight: 600; color: #ff6b35; margin-bottom: 4px; text-decoration: none; display: block;";
                discogsTitle.addEventListener('mouseenter', () => {
                    discogsTitle.style.textDecoration = 'underline';
                });
                discogsTitle.addEventListener('mouseleave', () => {
                    discogsTitle.style.textDecoration = 'none';
                });
                discogsDiv.appendChild(discogsTitle);
                
                // Добавляем жанры
                if (discogsInfo.genres && discogsInfo.genres.length > 0) {
                    const genreDiv = document.createElement('div');
                    genreDiv.style = "font-size: 11px; color: rgba(255, 255, 255, 0.8); margin: 2px 0;";
                    genreDiv.innerHTML = `<strong>Жанр:</strong> ${discogsInfo.genres.slice(0, 3).join(', ')}`;
                    discogsDiv.appendChild(genreDiv);
                }
                
                // Добавляем стили
                if (discogsInfo.styles && discogsInfo.styles.length > 0) {
                    const styleDiv = document.createElement('div');
                    styleDiv.style = "font-size: 11px; color: rgba(255, 255, 255, 0.8); margin: 2px 0;";
                    styleDiv.innerHTML = `<strong>Стиль:</strong> ${discogsInfo.styles.slice(0, 3).join(', ')}`;
                    discogsDiv.appendChild(styleDiv);
                }
                
                // Добавляем год и страну в одну строчку
                if (discogsInfo.year || discogsInfo.country) {
                    const yearCountryDiv = document.createElement('div');
                    yearCountryDiv.style = "font-size: 11px; color: rgba(255, 255, 255, 0.8); margin: 2px 0;";
                    
                    let yearCountryText = '';
                    if (discogsInfo.year && discogsInfo.country) {
                        yearCountryText = `<strong>Год:</strong> ${discogsInfo.year} • <strong>Страна:</strong> ${discogsInfo.country}`;
                    } else if (discogsInfo.year) {
                        yearCountryText = `<strong>Год:</strong> ${discogsInfo.year}`;
                    } else if (discogsInfo.country) {
                        yearCountryText = `<strong>Страна:</strong> ${discogsInfo.country}`;
                    }
                    
                    yearCountryDiv.innerHTML = yearCountryText;
                    discogsDiv.appendChild(yearCountryDiv);
                }
                
                // Добавляем лейбл
                if (discogsInfo.labels && discogsInfo.labels.length > 0) {
                    const labelDiv = document.createElement('div');
                    labelDiv.style = "font-size: 11px; color: rgba(255, 255, 255, 0.8); margin: 2px 0;";
                    labelDiv.innerHTML = `<strong>Лейбл:</strong> ${discogsInfo.labels[0].name}`;
                    discogsDiv.appendChild(labelDiv);
                }
                
                
                // Создаем или находим контейнер для горизонтального размещения
                let horizontalContainer = metaContainer.parentNode.querySelector('.music-info-container');
                if (!horizontalContainer) {
                    horizontalContainer = document.createElement('div');
                    horizontalContainer.className = 'music-info-container';
                    horizontalContainer.style = "display: flex; margin-top: 8px; gap: 8px;";
                    metaContainer.parentNode.insertBefore(horizontalContainer, metaContainer.nextSibling);
                }
                
                // Добавляем блок Discogs в контейнер
                horizontalContainer.appendChild(discogsDiv);
            }
        } catch (error) {
            console.error('❌ Ошибка при добавлении информации Discogs:', error);
        }
    };

    // Функция для добавления даты цифрового релиза на страницу
    const addReleaseDateToPage = (releaseDate) => {
        try {
            // Ищем элемент с датой релиза по data-test атрибуту
            const releaseDateElement = document.querySelector('span[data-test="meta-release-date"]');
            
            if (releaseDateElement && releaseDate) {
                // Проверяем, не добавлена ли уже дата цифрового релиза
                if (!releaseDateElement.textContent.includes('(')) {
                    // Форматируем дату
                    let formattedDate = '';
                    if (releaseDate.includes('T')) {
                        // Если дата в формате ISO (например: "2025-01-15T00:00:00Z")
                        const date = new Date(releaseDate);
                        formattedDate = date.toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                    } else if (releaseDate.includes('-')) {
                        // Если дата в формате "2025-01-15"
                        const [year, month, day] = releaseDate.split('-');
                        formattedDate = `${day}.${month}.${year}`;
                    } else {
                        // Если дата в другом формате, используем как есть
                        formattedDate = releaseDate;
                    }
                    
                    // Добавляем дату цифрового релиза в скобках
                    const originalText = releaseDateElement.textContent;
                    releaseDateElement.textContent = `${originalText} (${formattedDate})`;
                    
                    // Добавляем title для полной информации
                    releaseDateElement.title = `Год релиза: ${originalText}, Цифровой релиз: ${formattedDate}`;
                    
                }
            } else {
                console.log('⚠️ Элемент с датой релиза не найден или releaseDate отсутствует');
            }
        } catch (error) {
            console.error('❌ Ошибка при добавлении даты цифрового релиза:', error);
        }
    };

    const getAlbumIdFromUrl = () => {
        const match = window.location.pathname.match(/\/album\/(\d+)/);
        return match ? match[1] : null;
    };
    const getMixIdFromUrl = () => {
        //https://listen.tidal.com/mix/001c88bcd0300b9bb9e9b4f40d162e
        const match = window.location.pathname.match(/\/mix\/([a-f0-9]+)/);
        return match ? match[1] : null;
    };
    const getPlaylistIdFromUrl = () => {
        //https://listen.tidal.com/playlist/0d7307f4-d5f4-47c0-92a4-3f12833f8257
        const match = window.location.pathname.match(/\/playlist\/([a-f0-9-]+)/);
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
    // Настраиваем наблюдатель с расширенными опциями
    observer.observe(document.body, {
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['data-test']
    });

});
