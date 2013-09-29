/**
 * Request for baidu api for song ids and so on.
 *
 */
var request = require('request');
var fs = require('fs');


var EventProxy = require('./node_modules/eventproxy');
var ep = new EventProxy();


var url = 'http://play.baidu.com/data/music/songlink?type=mp3&songIds=';
var total = 10;
var result = [];

function main(cb) {
    get();
    ep.once('finish', function (list) {
        // 在所有文件的异步执行结束后将被执行
        // 所有文件的内容都存在list数组中
        console.log('== finish == ');
        append(list);
        cb && cb();
    });
}

// TODO: using Promise to rewrite get() and outro()
function get(){
    request( url + randomIds(20).join(','), function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var songList;
            var temp;
            try {
                songList = JSON.parse(body).data.songList;
            }
            catch (ex) {
                return false;
            }
        
            songList.forEach(function(song){
                // Check the link is not empty
                if (song.songLink) {
                    // Dig out things we want
                    temp = {
                        songId: song.songId,
                        songName: song.songName,
                        artistId: song.artistId,
                        artistName: song.artistName,
                        albumId: song.albumId,
                        albumName: song.albumName,
                        time: song.time
                    }
                    result.push(temp);
                }
            })

            // console.log(result);
            
        }
        
        var rest = total - result.length;
        // End
        if (rest <= 0) {
            ep.emit('finish', result);
            result = [];
        }
        else {
            console.log('== ' + rest + ' to go ==');
            setTimeout(get, 1000);
        }

    });
}

// Append result to file
function append(t){
    var root = '../songs';
    var files = fs.readdirSync(root);
    var file = root + '/' + files.length;
    var content = JSON.stringify(t);
    // '[{xxx:yyy},{aaa:bbb}]' ==> '{xxx:yyy},{aaa:bbb}'
    content = content.replace(/^\[/,'').replace(/\]$/,'');
    fs.appendFile(file, content, function (error) {
        if (error) {
            throw error;
        }
        else {
            console.log('== #' + files.length + ' done ==');
        }
    });
}


/**
 * Get an array contains random song ids
 * @param num
 * @returns {Array}
 */
function randomIds(num) {
    var result = [];
    num = num || 10;

    // result.push('64563422');

    for (var i = 0; i < num; i++) {
        result.push(randomInt(100000, 100000000));
    }
    return result;
}

/**
 * Generate random int number in (min, max)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInt(min, max) {
    var r = Math.floor(Math.random() * max);
    if (r < min) {
        return arguments.callee();
    }
    else {
        return r;
    }
}

/**
 * exports as a cmd module
 */
exports.main = main;