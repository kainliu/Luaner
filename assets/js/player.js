$(document).ready(function () {

    var player = {
        g: $('#jquery_jplayer_1')
    };

    init();

    function init() {

        // Init two buttons
        $('#play').click(function () {
            $("#pause").fadeIn();
        })

        $('#pause').click(function () {
            $("#play").fadeIn();
        })

        // jPlayer error
        player.g.bind($.jPlayer.event.error, function (event) {
            var error = 'error';
            try {
                error = event.jPlayer.error.message;
            }catch(e){
            }

            callApp(error);
        })

        initMessager();

        // Player is ready!
        setTimeout( function () {
            callApp('ready');
        }, 0);
    }

    /**
     * When receive an object, take it as a song data in json as default
     * Otherwise, trigger the button with the id.
     */
    function initMessager() {
        window.addEventListener && window.addEventListener("message", receiveMessage, false);
        function receiveMessage(event) {
            var data = event.data;
            if (typeof data === 'object') {
                // data = 'info';
                playSong(data);
            }
            else {
                switch (data) {
                    default:
                        break;

                    case 'pause':
                        player.g.jPlayer("pause");
                        break;

                    case 'play':
                        player.g.jPlayer("play");
                        break;
                }
            }
        }
    }

    function callApp(msg) {
        setTimeout(function () {
            window.top.postMessage(msg, '*');
        }, 0);
    }

    function playSong(songData) {

        // Check whether anything to play
        if (!songData || !songData.songLink) {
            return false;
        }

        // Will not refresh the current page, have to rebuild the jPlayer manually.
        player.g.jPlayer("destroy");

        player.g.jPlayer({
            // Start to play as soon as the player is built
            ready: function () {

                callApp("begin");

                $(this).jPlayer("setMedia", {
                    mp3: songData.songLink
                });
                $(this).jPlayer("play", 0);

            },
            play: function() {
                callApp('play');
            },
            pause: function() {
                callApp('pause');
            },
            ended: function () {
                callApp('end');
                $(this).jPlayer("destroy");
            },
            // swfPath: "http://www.luaner.com/assets/js/jplayer.swf",
            swfPath: "http://drmcmm.baidu.com/media/id=nHRLrjfdPjRk&gp=401&time=nHnLPH0zn1mvn6.swf",
            supplied: "mp3",
            wmode: "window",
            smoothPlayBar: true,
            keyEnabled: true
        });

        // $("#jplayer_inspector").jPlayerInspector({jPlayer:player.g});
    }


});