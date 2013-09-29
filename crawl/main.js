var get = require('./get');
var times = process.argv[2] || 10;
// console.log(times);

loop(get.main, times);

function loop(task, times){
    (function () {
        if (times) {
            //console.log(arguments.callee)
            //console.log(times)
            task && task(arguments.callee);
            times--;
        }
        else {
            return;
        }
    })();
}
