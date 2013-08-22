/**
 * Baskino.com plugin for Showtime
 *
 *  Copyright (C) 2013 lprot
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

(function(plugin) {

    var PREFIX = 'baskino';
    var BASE_URL = 'http://baskino.com';
    var logo = plugin.path + "logo.png";

    const blue = "6699CC", orange = "FFA500";

    function colorStr(str, color) {
        return '<font color="' + color + '">(' + str + ')</font>';
    }

    function coloredStr(str, color) {
        return '<font color="' + color + '">' + str + '</font>';
    }

    function getTimestamp(str) {
        if (!str) return 0;
        var d = str.match(/\d+/g); // extract date parts
        return +Date.UTC(d[2], d[1] - 1, d[0]) / 1000; // year, month, day
    }

    function setPageHeader(page, title) {
        if (page.metadata) {
            page.metadata.title = title;
            page.metadata.logo = logo;
        }
        page.type = "directory";
        page.contents = "items";
    }

    function trim(s) {
        return s.replace(/(\r\n|\n|\r)/gm, "").replace(/(^\s*)|(\s*$)/gi, "").replace(/[ ]{2,}/gi, " ");
    }

    var service = plugin.createService("Baskino.com", PREFIX + ":start", "video", true, logo);

    function startPage(page) {
        setPageHeader(page, 'Baskino.com - Онлайн фильмы в HD качестве');
//        page.appendItem(PREFIX + ':movies', 'directory', {
//            title: 'Фильмы',
//            icon: logo
//        });
//        page.appendItem(PREFIX + ':new', 'directory', {
//            title: 'Новинки',
//            icon: logo
//        });
//        page.appendItem(PREFIX + ':best', 'directory', {
//            title: 'Топ-250',
//            icon: logo
//        });
//        page.appendItem(PREFIX + ':serials', 'directory', {
//            title: 'Сериалы',
//            icon: logo
//        });

        page.appendItem("", "separator", {
            title: 'Рекомендуемое:'
        });
        var response = showtime.httpGet(BASE_URL);
        page.loading = false;
        // 1 - link, 2 - title, 3 - image, 4 - regie
        var re = /<img  onclick=\(window.location.href='(.*?)'\); title="(.*?)"[\S\s]*?src="(.*?)"[\S\s]*?'\);>(.*?)<\/span>/g;
        var match = re.exec(response);
        while (match) {
            page.appendItem(PREFIX + ':index:' + escape(BASE_URL + match[1]), 'video', {
                title: new showtime.RichText(match[2]),
                icon: match[3],
                description: new showtime.RichText('Режиссер: ' + colorStr(match[4], blue))
            });
            match = re.exec(response);
        };

        page.appendItem("", "separator", {
            title: 'Новинки:'
        });
        re = /<div class="carousel">([\S\s]*?)<\/div>/;
        var n = re.exec(response)[1];
        // 1 - link, 2 - title, 3 - image, 4 - quality
        re = /<a href="([\S\s]*?)"><img title="([\S\s]*?)" src="([\S\s]*?)"[\S\s]*?class="quality_type ([\S\s]*?)">/g;
        var match = re.exec(n);
        while (match) {
            page.appendItem(PREFIX + ':index:' + escape(BASE_URL + match[1]), 'video', {
                title: new showtime.RichText(match[2] + ' ' + (match[4] == "quality_hd" ? colorStr("HD", blue) : colorStr("DVD", orange))),
                icon: match[3]
            });
            match = re.exec(n);
        };

        page.appendItem("", "separator", {
            title: 'Фильмы онлайн:'
        });

        var p = 1;

        function loader() {
            // 1 - link, 2 - title, 3 - image, 4 - quality, 5 - quoted full title, 6 - raiting, 7 - number of comments, 8 - date added, 9 - production date
            re = /<div class="postcover">[\S\s]*?<a href="([\S\s]*?)">[\S\s]*?<img title="([\S\s]*?)" src="([\S\s]*?)"[\S\s]*?class="quality_type ([\S\s]*?)">[\S\s]*?<div class="posttitle">[\S\s]*?">([\S\s]*?)<\/a>[\S\s]*?<li class="current-rating" style="[\S\s]*?">([\S\s]*?)<\/li>[\S\s]*?<!-- <div class="linline">([\S\s]*?)<\/div>[\S\s]*?<div class="linline">([\S\s]*?)<\/div>[\S\s]*?<div class="rinline">([\S\s]*?)<\/div>/g;
            var match = re.exec(response);
            while (match) {
                page.appendItem(PREFIX + ':index:' + escape(match[1]), 'video', {
                    title: new showtime.RichText(match[5] + ' ' + (match[4] == "quality_hd" ? colorStr("HD", blue) : colorStr("DVD", orange))),
                    rating: +(match[6]) / 2,
                    icon: match[3],
                    description: match[7] + '\n' + match[8] + '\n' + match[9].replace(/<span class="tvs_new">/, "").replace(/<\/span>/, "")
                });
                match = re.exec(response);
            };
            p++;
            re = /">Вперед<\/a>/;
            if (re.exec(response)) {
                response = showtime.httpGet(BASE_URL + "/page/" + p + "/");
                return true;
            };
            return false;
        }
        loader();
        page.paginator = loader;
    };

    // Search IMDB ID by title
    function getIMDBid(title) {
        var resp = showtime.httpGet('http://www.google.com/search?q=imdb+' + encodeURIComponent(showtime.entityDecode(unescape(title))).toString()).toString();
        var re = /http:\/\/www.imdb.com\/title\/(tt\d+).*?<\/a>/;
        var imdbid = re.exec(resp);
        if (imdbid) imdbid = imdbid[1];
        else {
            re = /http:\/\/<b>imdb<\/b>.com\/title\/(tt\d+).*?\//;
            imdbid = re.exec(resp);
            if (imdbid) imdbid = imdbid[1];
        }
        return imdbid;
    };

    // No video
    plugin.addURI(PREFIX + ":novideo", function(page) {
        page.error('Это видео изъято из публичного доступа. / This video is not available, sorry :(');
        page.loading = false;
    });

    //Play vk.com links
    plugin.addURI(PREFIX + ":vk:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        var response = showtime.httpGet(unescape(url));
        var re = /url720=(.*?)&/;
        var link = re.exec(response);
        if (!link) {
            re = /url480=(.*?)&/;
            link = re.exec(response);
        }
        if (!link) {
            re = /url360=(.*?)&/;
            link = re.exec(response);
        }
        if (!link) {
            re = /url240=(.*?)&/;
            link = re.exec(response);
        }
        if (link) {
            page.type = "video";
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                imdbid: getIMDBid(title),
                sources: [{
                    url: link[1]
                }]
            });
        } else page.error('Видео не доступно. / This video is not available, sorry :(');
        page.loading = false;
    });

    //Play bk.com links
    plugin.addURI(PREFIX + ":bk:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        page.type = "video";
        page.source = "videoparams:" + showtime.JSONEncode({
            title: unescape(title),
            imdbid: getIMDBid(title),
            sources: [{
                url: unescape(url)
            }]
        });
        page.loading = false;
    });

    // Play megogo links
    plugin.addURI(PREFIX + ":megogo:(.*)", function(page, url) {
        var re = /[\S\s]*?([\d+^\?]+)/i;
        var match = re.exec(url);
        var sign = showtime.md5digest('video=' + match[1] + '1e5774f77adb843c');
        sign = showtime.JSONDecode(showtime.httpGet('http://megogo.net/p/info?video=' + match[1] + '&sign=' + sign + '_samsungtv'));
        if (!sign.src) {
            page.loading = false;
            showtime.message("Error: This video is not available in your region :(", true, false);
            return;
        }
        page.type = "video";
        page.source = "videoparams:" + showtime.JSONEncode({
            title: unescape(sign.title),
            imdbid: getIMDBid(sign.title),
            canonicalUrl: PREFIX + ":megogo:" + url,
            sources: [{
                url: sign.src
            }]
        });
        page.loading = false;
    });

    // Index page
    plugin.addURI(PREFIX + ":index:(.*)", function(page, url) {
        var response = showtime.httpGet(unescape(url)).toString();
        var re = /<title>(.*?)<\/title>/;
        setPageHeader(page, showtime.entityDecode(re.exec(response)[1]).replace(' - смотреть онлайн бесплатно в хорошем качестве', ''));
        re = /<div class="description"[\S\s]*?<div id="[\S\s]*?">([\S\s]*?)<br\s\/>/;
        var description = trim(re.exec(response)[1]);
        re = /<td itemprop="name">([\S\s]*?)<\/td>/;
        var title = re.exec(response)[1];
        re = /<td itemprop="alternativeHeadline">([\S\s]*?)<\/td>/;
        var origTitle = re.exec(response);
        if (origTitle) title += " | " + origTitle[1];
        re = /<img itemprop="image"[\S\s]*?src="([\S\s]*?)"/;
        var icon = re.exec(response)[1];
        re = />Год:<\/td>[\S\s]*?<a href="[\S\s]*?">([\S\s]*?)<\/a>/;
        var year = +re.exec(response)[1];
        re = />Страна:<\/td>[\S\s]*?<td>([\S\s]*?)<\/td>/;
        var country = re.exec(response)[1];
        re = />Слоган:<\/td>[\S\s]*?<td>([\S\s]*?)<\/td>/;
        var slogan = re.exec(response)[1];
        re = /<td itemprop="duration">([\S\s]*?)<\/td>/;
        var duration = re.exec(response)[1];
        re = /<b itemprop="ratingValue">([\S\s]*?)<\/b>/;
        var rating = re.exec(response)[1].replace(",", ".") * 10;
        re = /<a itemprop="director" href="[\S\s]*?">([\S\s]*?)<\/a>/;
        var director = re.exec(response)[1];
        re = /<div class="last_episode">Последняя серия добавлена ([\S\s]*?)<\/div>/;
        var timestamp = re.exec(response);
        if (timestamp) timestamp = getTimestamp(timestamp[1]);
        re = /<span itemprop="name">([\S\s]*?)<\/span>/g;
        var match = re.exec(response);
        var actors = 0;
        while (match) {
            if (!actors) actors = match[1];
            else actors += ", " + match[1];
            match = re.exec(response);
        };
        re = /<a itemprop="genre" href="[\S\s]*?">([\S\s]*?)<\/a>/g;
        var match = re.exec(response);
        var genre = 0;
        while (match) {
            if (!genre) genre = match[1];
            else genre += ", " + match[1];
            match = re.exec(response);
        };

        var links = new Array();
        if (timestamp) { // that is a series
            re = /"([0-9]+)":"([\S\s]*?)>"/g;
            match = re.exec(response);
            while (match) {
                var re2 = /<iframe [\S\s]*?src=\\"([\S\s]*?)\\"/; // try vk.com links
                var lnk = re2.exec(match[2]);
                if (lnk) lnk = PREFIX + ":vk:" + escape(lnk[1].replace(/\\/g, ''));
                if (!lnk) {
                    re2 = /file: \\"([\S\s]*?)\\"/; // try baskino links
                    lnk = PREFIX + ":bk:" + escape(re2.exec(match[2])[1].replace(/\\/g, ''));
                }
                links[+match[1]] = lnk;
                match = re.exec(response);
            };
            re = /<div id="episodes-([0-9]+)"([\S\s]*?)<\/div>/g;
            match = re.exec(response);
            while (match) {
                page.appendItem("", "separator", {
                    title: 'Сезон ' + match[1]
                });
                re2 = /<span onclick="showCode\(([0-9]+),this\);">([\S\s]*?)<\/span>/g;
                var match2 = re2.exec(match[2]);
                while (match2) {
                    page.appendItem(links[match2[1]] + ":" + escape(match2[2]), 'video', {
                        title: match2[2],
                        icon: icon,
                        year: year,
                        genre: genre,
                        duration: duration,
                        rating: rating,
                        timestamp: timestamp,
                        description: new showtime.RichText(coloredStr("Страна: ", orange) + country + coloredStr(" Слоган: ", orange) + slogan + coloredStr(" Режиссер: ", orange) + director + coloredStr(" В ролях: ", orange) + actors + "\n\n" + description)
                    });
                    match2 = re2.exec(match[2]);
                };
                match = re.exec(response);
            };
        } else { // this is a single movie
            re = /<iframe src="http:\/\/vk.com(.*?)"/; // try vk.com link
            var link = re.exec(response);
            if (link) {
                link = PREFIX + ":vk:" + escape("http://vk.com" + link[1]) + ":" + escape(title);
            } else {
                re = /src="http:\/\/megogo.net(.*?)"/; // try megogo.net link
                link = re.exec(response);
                if (link) {
                    link = PREFIX + ":megogo:" + escape(link[1]) + ":" + escape(title);
                }
            }
            if (!link) { // try baskino links
                link = response.match(/file:"([^"]+)/);
                if (link) {
                    link = link[1];

                    var videoparams = {
                        sources: [{
                            url: link
                        }],
                        title: title,
                        imdbid: getIMDBid(escape(title))
                    };
                    link = "videoparams:" + showtime.JSONEncode(videoparams);
                }
            }

            page.appendItem(link, 'video', {
                title: title,
                icon: icon,
                year: year,
                genre: genre,
                duration: duration,
                rating: rating,
                timestamp: timestamp,
                description: new showtime.RichText(coloredStr("Страна: ", orange) + country + coloredStr(" Слоган: ", orange) + slogan + coloredStr(" Режиссер: ", orange) + director + coloredStr(" В ролях: ", orange) + actors + "\n\n" + description)
            });
        };
        re = /<div class="related_news">([\S\s]*?)<\/li><\/ul>/;
        response = re.exec(response)[1];
        re = /<div class="mbastitle">([\S\s]*?)<\/div>/;
        page.appendItem("", "separator", {
            title: re.exec(response)[1]
        });
        // 1 - link, 2 - icon, 3 - title, 4 - quality
        re = /<a href="([\S\s]*?)"><img src="([\S\s]*?)"[\S\s]*?\/><span>([\S\s]*?)<\/span>[\S\s]*?class="quality_type ([\S\s]*?)">/g;
        match = re.exec(response);
        while (match) {
            page.appendItem(PREFIX + ":index:" + escape(match[1]), 'video', {
                title: new showtime.RichText(match[3] + ' ' + (match[4] == "quality_hd" ? colorStr("HD", blue) : colorStr("DVD", orange))),
                icon: match[2]
            });

            match = re.exec(response);
        };
        page.loading = false;
    });

    plugin.addURI(PREFIX + ":start", startPage);

    plugin.addSearcher("baskino.com", logo,

    function(page, query) {
        var fromPage = 1,
            tryToSearch = true;
        // 1-link, 2-title, 3-image, 4-quality, 5-quoted full title, 6-raiting, 7-number of comments, 8-date added, 9-production date
        var re = /<div class="postcover">[\S\s]*?<a href="([\S\s]*?)"[\S\s]*?<img title="([\S\s]*?)" src="([\S\s]*?)"[\S\s]*?class="quality_type ([\S\s]*?)">[\S\s]*?<div class="posttitle">[\S\s]*?" >([\S\s]*?)<\/a>[\S\s]*?<li class="current-rating" style="[\S\s]*?">([\S\s]*?)<\/li>[\S\s]*?<!-- <div class="linline">([\S\s]*?)<\/div>[\S\s]*?<div class="linline">([\S\s]*?)<\/div>[\S\s]*?<div class="rinline">([\S\s]*?)<\/div>/g;
        var re2 = /href=\#>Вперед<\/a>/;

        function loader() {
            if (!tryToSearch) return false;
            var response = showtime.httpGet(BASE_URL + '/index.php?do=search&subaction=search&search_start=' + fromPage + '&story=' + query.replace(/\s/g, '\+'));
            var match = re.exec(response);
            while (match) {
                page.appendItem(PREFIX + ':index:' + escape(match[1]), 'video', {
                    title: new showtime.RichText(match[5] + ' ' + (match[4] == "quality_hd" ? colorStr("HD", blue) : colorStr("DVD", orange))),
                    icon: match[3],
                    rating: +(match[6]) / 2,
                    description: match[8] + '\n' + match[9].replace(/<span class="tvs_new">/, "").replace(/<\/span>/, "")
                });
                page.entries++;
                match = re.exec(response);
            };

            if (!re2.exec(response)) return tryToSearch = false;
            fromPage++;
            return true;
        };
        loader();
        page.paginator = loader;
    });
})(this);
