// ====== requirejs config
// =======================
requirejs.config({
    // baseUrl: 'js',
    shim: {
        'jquery.min': {
            exports: '$'
        },
        'underscore': {
            exports: '_'
        },
        'backbone': {
            deps: ['underscore'],
            exports: 'Backbone'
        }
    }
});

// ====== requirejs starts
// =======================
requirejs(['jquery.min', 'underscore' ,'backbone', 'mustache'], function ($, _, Backbone, Mustache) {

    // ====== requirejs factory
    // ========================

    // Config
    var INTERVAL_TIME = 2000;
    var DEBUG_MODE = initDebug();
    // We take songs to be played as `candidates`.
    var CANDIDATES_MIN = 2;

    // Global
    var appPlayer = {
        g: $("#playerFrame"),
        ready: false,
        // Music player is one-thread , set up a queue to store user command.
        commands: [],
        // Avoid submit commands too quick.
        lastCommandTime: 0
    };

    // Create a model for the song
    var Song = Backbone.Model.extend({

        // These are default values
        defaults: {

            // songId: '244200',
            // songName: 'red sun',
            // songLink: 'http://www.baidu.com',
            // time: '10',

            // Private status used in
            // wait, begin, end, skip, pro
            _s: 'wait'
        },

        begin: function () {
            this.set('_s', 'begin');
            callAppPlayer(this.attributes);
        },

        end: function () {
            this.set('_s', 'end');
        },

        skip: function () {
            this.set('_s', 'skip');
            callAppPlayer('pause');
        },

        pro: function () {
            // send pro link

        }

    });

    // Create view for model song
    var SongView = Backbone.View.extend({
        tagName: 'div',

        initialize: function () {
            // this.listenTo(this.model, 'change', this.render);
        },

        events: {
            'hover': 'toggleTools'
        },

//        <div class="input-prepend">
//            <span class="add-on">@</span>
//            <input class="span2" id="prependedInput" type="text" placeholder="Username">
//            </div>

        template: function (data) {

            var template = [
                '<p class="songName">{{songName}}</p>',
                '<div class="songExternal">',
                    '<p class="input-prepend">',
                        '<span class="add-on"><img src="assets/img/link.png"/></span><input type="text" value="http://www.luaner.com/?s={{songId}}" />',
                    '</p>',

                    '<p><a href="http://music.baidu.com/song/{{songId}}/download" target="_blank"  class="btn" >',
                        '<img src="assets/img/download.png"/> Go download',
                    '</a></p>',
                '</div>'
            ];
            return Mustache.to_html(template.join(''), data);
        },

        render: function () {
            console.debug('song render');
            var rendered = this.template(this.model.toJSON());
            this.$el.html(rendered);



            // Chain usage
            return this;
        },

        toggleTools: function () {

        }
    });


    // Create a collection for songs
    var SongList = Backbone.Collection.extend({

        // Will hold objects of the Song model
        model: Song,

        // Find playing item
        playing: function () {
            var item = this.findWhere({
                _s: 'begin'
            });
            return item ? item : false;
        },

        pause: function () {

        },

        // Auto begin next song
        end: function () {
            return this.next('end');
        },

        // Skip to next song. People don't like it.
        skip: function () {
            return this.next('skip');
        },

        // Play next song
        next: function (command) {
            var playing = this.playing();

            // Update the status of the current one to `skip` or `end`
            if (playing && playing[command]) {
                playing[command]();
            }

            // Begin next song
            return this.begin();

        },

        // Begin the list
        begin: function () {
            // If we have a song playing, keep it going.
            if (this.playing()) {
                return false;
            }
            // Find next candidate
            var item = this.findWhere({
                _s: 'wait'
            });
            item && item.begin();

            this.trigger('begin');

            // We have consumed a song.
            this.supply();
        },

        // Check how many candidates are left
        supply: function () {
            var can = this.where({
                _s: 'wait'
            });
            if (can.length <= CANDIDATES_MIN) {
                this.req();
            }
        },

        // Request for more candidates
        //
        // TODO use native `collection.fetch`.
        req: function (ids) {
            ids = ids || [];

            // Pay attention not let `this` to be `Window`
            var me = this;

            // Store AJAX attributes
            var fn = arguments.callee;

            // TODO Limit fails
            // if (fn.fail > 10) {
            //    return showError('request');
            // }

            // Limit requests during a period
            var now = new Date().getTime();
            if (now - fn.lastTime < INTERVAL_TIME) {
                setTimeout(function () {
                    me.req();
                }, INTERVAL_TIME);
                return false;
            }
            fn.lastTime = now;

            // Parse callback json
            function songParser(data) {
                // Try to get info
                var list = data.data.songList;
                var result = [];
                while (list.length) {
                    var can = list.shift();
                    // Only use songs with links
                    if (can.songLink) {
                        result.push(can);
                    }
                }

                // Result is not empty
                if (result.length) {

                    // Add to collection
                    me.add(result);

                    if (
                    // This is the 1st song
                        me.length === 1
                        // Or Nothing has begun.
                        || !me.playing()
                    ) {
                        me.begin();
                    }

                }
                else {
                    me.req();
                }

            }

            // Fetch playlist containing song ids
            requestList(ids, function (data) {
                // Fetch song details
                // TODO: use all info, and merge with the second request
                // Only use id now
                var ids = [];
                _.each(data.songList, function(song){
                    ids.push(song.songId);
                });

                requestDetail(ids, function (data) {
                    // Use try...catch... to handle external errors
                    safeExecute(songParser, data);
                });
            });

        },

        // Promote current song
        pro: function () {
            console.debug('pro')
            var play = this.findWhere({
                _s: 'play'
            });
            if (play) {
                console.debug('pro', play);
                // TODO Send to server
            }
        }

    });

    var songs = new SongList();

    var AppView = Backbone.View.extend({
        el: '#playerInfo',

        // === events starts
        // =================
        /*
        events: {
            'click': 'click'
        },

        click: function () {
            this.$el.find('.songExternal').css({'visibility': 'visible'});
        },
        */
        // === events ends
        // =================

        initialize: function () {
            var me = this;
            console.debug('app init');

            // Init
            // this.initButtons();
            initButtons();
            initMessager();
            initAppPlayer();

            // Bind resize event
            $(window).resize(function() {
                me.updateLayout();
            });

            this.listenTo(songs, 'begin', this.render);

            // First, fetch songs contained in url
            songs.req(urlIds());
        },


        render: function () {
            console.debug('app render');

            // Nothing to play, when users click 'next' tooo fast.
            var item = songs.playing();
            if (!item) {
                return false;
            }

            // Show playing song info
            var content = (function(){
                var view = new SongView({
                    model: item
                });
                return view.render().el;
            })();
            this.$el.html(content);

            // Change appearance
            this.updateLayout();

            return this;
        },

        /**
         * Update the layout without new content
         *
         */
        updateLayout: function (){
            this.updateAlign();
        },

        /**
         * Update the vertical and horizontal align of el
         */
        updateAlign: function (){

            var p = Math.floor (
                0.5 * ( $(window).height() - $('#main').height() - $('header').height() - $('footer').height() - 10 )
            );

            $('#main').css({
                //'height' :
                'padding-top': p + 'px',
                'padding-bottom': p + 'px'
            });

        }


    })

    // Create an app
    var app = new AppView();

    if (DEBUG_MODE) {
        window.songs = songs;
    }

    // Global
    $.fn.blink = function () {
        $(this).fadeOut('fast', function () {
            $(this).fadeIn();
        })
    }

    // Global delegate
    $('body').delegate('input[type=text]', 'click', function () {
        $(this).select();
    })

    function initButtons() {

        $('#skip').click( function (){
            $(this).blink();
            songs.skip();
        })

        $('#pro').click( function (){
            $(this).blink();
            $('.songExternal').css({
                'visibility' : 'visible'
            })
            songs.pro();
        })

        /*
        $('#playerNote').toggle( function (){
//            songs.pause();
            callAppPlayer('play');
        }, function () {
            callAppPlayer('pause')
        })
        */

//        $('#playerNote').click( function (){
//
//            if ($(this).hasClass('rotating-paused')) {
//                callAppPlayer('pause');
//            }
//            else {
//                callAppPlayer('play')
//            }
//        });
    }


    /**
     * Use event listener receive cross-domain info
     *
     * Leave `play` and `pause` to player itself.
     * `ready` and `error` describe the player status,
     * `begin` and `end` are for the song.
     * @returns {boolean}
     */
    function initMessager() {
        // Take `postMessage` as lowest requirements
        if (!window.postMessage) {
            showError('browser');
            return false;
        }

        window.addEventListener && window.addEventListener("message", receiveMessage, false);

        function receiveMessage(event) {

            var data = event.data;

            if (!data) {
                return false;
            }

            switch (data) {
                // player is inited and ready for a new play command
                case 'ready':
                    console.debug('player ready');
                    appPlayer.ready = true;
                    break;

                case 'begin':
                    console.debug('song begin');
                    songs.begin();
                    break;

                case 'play':
                    $('#playerNote').addClass('rotating');
                    $('#playerNote').removeClass('rotating-paused');
                    break;

                case 'pause':
                    $('#playerNote').addClass('rotating-paused');
                    break;

                case 'end':
                    console.debug('song end');
                    songs.end();
                    break;

                // Otherwise, show error message.
                default:
                    showError(data);
                    break;
            }
        }
        return true;
    }

     // Init the iframe of player
    function initAppPlayer() {
        // Mainly solve 2 cross-domin problems
        // - html5 audio 
        // - flash swf
        var playerHref = DEBUG_MODE ?
            'http://test.baidu.com/duapp/luaner/appidd2fy34gaja/2/player.html' :
            'http://music.baidu.com/static/html/cbjs.html?id=736206';

        appPlayer.g.attr({
            src: playerHref,
            width: 60,
            height: 60
        }).show();
        
        return true;
    }

    /**
     * Use postMessage to send cross-domain info
     */
    function callAppPlayer(msg) {

        var t = 500;
        var fn = arguments.callee;

        /*
        var now = new Date().getTime();
        // Throw away commands which are too dense
        if (now - appPlayer.lastCommandTime < t) {
            return false;
        }
        appPlayer.lastCommandTime = now;
        */

        // Command stored
        msg && appPlayer.commands.push(msg);

        // setTimeout 0 to support IE 8
        setTimeout(executeCommand, 0);

        function executeCommand() {
            if (appPlayer.ready) {
                var target = appPlayer.commands.shift();

                // Post message to control cross-domain iframe
                console.debug('send command: ', target);
                appPlayer.g[0].contentWindow.postMessage(target, '*');

                // Remains other commands
                if (appPlayer.commands.length) {
                    console.debug('other commands left');
                    return setTimeout(fn, t);
                }
                else{
                    console.debug('all commands done');
                    return true;
                }
            }
            // If the player is not inited, keep waiting
            else {
                console.debug('player not ready yet, wait another interval');
                return setTimeout(fn, t);
            }
        }

    }

    /**
     * Fetch the song data from cross-domain in JSONP
     * @param ids
     * @param callback
     */
    function requestDetail(ids, callback) {
        // `ids.join(',')` will return ',1234,5678' in IE, strangely
        var result = ids.join(',').replace(/^,/, '');
        var url = 'http://play.baidu.com/data/music/songlink?type=mp3&songIds=' + result;

        // Use JSONP
        $.ajax({
            url: url,
            dataType: "jsonp"
        }).done(callback);

    }

    /**
     * Request list from luaner server
     * @param callback
     */
    function requestList(ids, callback) {
        // var url = DEBUG_MODE ? 'list.php': 'http://www.luaner.com/list.php';
        var url = 'list.php?s=' + ids.join(',');

        $.ajax({
            url: url,
            dataType: "jsonp"
        }).done(callback);
    }

    /**
     * Get ids from url
     * @returns {Array}
     */
    function urlIds() {
        var mc = window.location.href.match(/(\?|&|#)s=([^&]+)(&|$)/i);
        // ?s=64512918,265898
        return (mc && mc[2]) ? mc[2].split(',') : false;
    }


    /**
     * Get an array contains random song ids
     * @param num
     * @returns {Array}
     */
    function randomIds(num) {
        var result = [];
        num = num || 10;
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
     * Show erros according to different message
     * @param msg
     */
    function showError(msg) {
        var content = 'Sorry! ';

        switch (msg) {
            case 'browser':
                content += 'Your browser is not compatible.';
                break;

            case 'request':
                content += 'No response from server yet. Please refresh after a while.';
                break;

            case 'player':
                content += 'Some error happens to the audio player';
                break;

            case 'error':
                content += 'Something unexpected happens..';
                break;

            default:
                content += msg;
                break;
        }

        var template = '' +
            '<div id="errorContainer" class="container">' +

                '<h3>{{content}}</h3>' +
                '<p>These browsers are fully tested and well supported:</p>' +
                '<p>' +
                    '<a href="http://www.google.com/search?q=download+chrome"> Chrome /</a>' +
                    '<a href="http://www.google.com/search?q=download+firefox"> Firefox /</a>' +
                    '<a href="http://www.google.com/search?q=download+safari"> Safari </a>' +
                '</p>' +

            '</div>';

        $('#main').html(Mustache.to_html(template, {
            content: content
        }));
    }


    /**
     * Detect and enable debug functionality
     */
    function initDebug(){
        var debug_on = (document.location.href.indexOf("debug") !== -1);
        if (!debug_on) {
            console.debug = function(){};
        }
        return debug_on;
    };

    /**
     * Use try...catch... to avoid fatal errors going online
     * @param func
     * @param args
     */
    function safeExecute(func, args) {

        if (DEBUG_MODE) {
            func.call(func, args);
        }
        else {
            try{
                func.call(func, args);
            }
            catch(e){
            }
        }

    }

    // ====== requirejs ends
    // =====================

});