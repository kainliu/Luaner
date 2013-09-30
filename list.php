<?php

// File counts
$list = 500;

// JSONP callback
$cb = empty($_GET['callback']) ? 'callback' : $_GET['callback'];

// JSON header
header('Content-Type: application/json');

// Get given song ids
function get() {
    // Check empty
    $s = $_GET['s'];
    if (empty($s)) {
        return '';
    }

    // 123,456
    $ids = explode(',', $s);
    $result = '';
    foreach ($ids as $key => $id) {
        $result = $result.'{"songId":"'.$id.'"},';
    }
    
    return $result;

}

// Random INT 
function randomInt($min, $max){
    return mt_rand($min, $max);
}

// Open random data in dir `songs/`
$filename = "songs/".randomInt(0, $list);
$handle = fopen($filename, "r");
$contents = fread($handle, filesize($filename));
fclose($handle);

//return JSON
$result = $cb.'({"songList": ['.get().$contents.']})';
echo $result;

?>