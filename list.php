<?php

// JSON header
header('Content-Type: application/json');

function getGivenIds() {
    return '{"songId":'.$_GET['s'].'}';
}

function randomInt($min, $max){
    return mt_rand($min, $max);
}

$filename = "songs/".randomInt(0, 10);
$handle = fopen($filename, "r");
$contents = fread($handle, filesize($filename));
fclose($handle);
$contents = 'lr_playlist_add('.$contents.');';



$result = array_merge(array(getGivenIds()), randomIds(9));
$result = json_encode($result);
echo $result;
//var_dump();

?>