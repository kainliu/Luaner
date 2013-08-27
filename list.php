<?php

// JSON header
header('Content-Type: application/json');

function getGivenIds() {
    return $_GET['s'];
}

/**
 * Get an array contains random song ids
 * @param num
 * @returns {Array}
 */
function randomIds($num = 10) {
    $result = array();
    for ($i = 0; $i < $num; $i++) {
        array_push($result, randomInt(100000, 100000000));
    }
    return $result;
}

function randomInt($min, $max){
    return mt_rand($min, $max);
}

$haoshengyin = array(65545699,64563191,64563278,64578118,65602376,65602387,65354738,65354402,64563422,64578161,64563603,64563221,65602377,64563287,64563458,65602367,65602383,65602381,65354967,64563107,64563148);

// 1首好声音，9首随机
$recommend = $haoshengyin[array_rand($haoshengyin, 1)];
//var_dump( $haoshengyin[$recommend] );
//var_dump( randomIds(9) );

$result = array_merge(array(getGivenIds()), array($recommend), randomIds(9));
$result = json_encode($result);
echo $result;
//var_dump();

?>