<?php

/*
    Reference PHP API design for SnowSense face recognition web service
    Created on 3/30/2017
    @author: SnowSense
    Ver 0.1
    Note: must have PHP Version ^5.5 and enable cUrl module.
*/




/*
Use PHP cUrl module to Post data / file to url
:param url: string, URL string to post
:param data: array, data for post , include FILE
:param upfile : bol, upload a file or not
:return :if success,  Server response
         on error, false
*/
function postData($url,$data = array(),$upfile = false ){
    $ch = curl_init();
    if($upfile){
       // curl_setopt($ch, CURLOPT_SAFE_UPLOAD, true);
    }else{
        $data = http_build_query($data);
    }
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_TIMEOUT,60);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS,$data );

    $output = curl_exec($ch);
    $errorCode = curl_errno($ch);
    $info = curl_getinfo($ch);
    curl_close($ch);

    if(0 !== $errorCode) {
        return (false);
    }
    return ($output);
}


/*
Use PHP cUrl module to get Data from url
:param url: string, URL string to post
:return :if success,  Server response
         on error, false
*/
function getUrl($url){
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_TIMEOUT,10);

    $output = curl_exec($ch);
    $errorCode = curl_errno($ch);
    curl_close($ch);

    if(0 !== $errorCode) {
        return (false);
    }
    return ($output);
}

/*
 A helping function generating API URL string for a given API name.

:param api_name: string; the API name
:return: API URL string

*/
function _get_api_url($api_name){
    include("/var/www/html/owncloud/apps/faceapi/conf.php");
    //global $face_server_conf;
    $api_Url = $face_server_conf["SERVER"] . $api_name;
    $api_key = $face_server_conf['API_KEY'];
    $api_secret = $face_server_conf['API_SECRET'];

    $api_Url .='?apikey=' . urlencode($api_key).'&'.'secretkey='.urlencode($api_secret);

    return($api_Url);
}


/*
Check if the input string is a valid URL.

:param url: a URL string to check
:return: True or False
*/
function _is_valid_url($url){
    $regex = '@(?i)\b((?:[a-z][\w-]+:(?:/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:\'".,<>?«»“”‘’]))@';
    return(preg_match($regex,$url));
}


/*
Add a person's name and ID to the web service.

:param name: person's name (string)
:param person_id: a person ID (string)
:return:
*/
function add_person($name,$person_id = ''){
    $url = _get_api_url('addperson');

    $data = array('name' => $name);

    if($person_id != ''){
        $data['personId'] = $person_id;
    }

    $res_obj = postData($url,$data);
    return ($res_obj);

}


/*
Detect all faces in one image

:param image_path: a local image path
:return: a json string
    Example:
    {'faces': [{'bottom': 270,
       'faceId': 'face_1ceae97e-16aa-11e7-b31b-0242ac120003',
       'faceness': 1.9446442760957594,
       'imageHeight': 610,
       'imageWidth': 920,
       'left': 581,
       'right': 617,
       'top': 234},
      ......
      {'bottom': 270,
       'faceId': 'face_1ceaf536-16aa-11e7-b31b-0242ac120003',
       'faceness': 0.7359679378999586,
       'imageHeight': 610,
       'imageWidth': 920,
       'left': 709,
       'right': 745,
       'top': 234}]}
*/
function detect_face_local($image_path){
    $url = _get_api_url('facedetect');
    if(realpath($image_path) !== false){
	if (version_compare(PHP_VERSION, '5.5.0') === -1) {
            $data = array('image' => '@'.realpath($image_path));
            //var_dump($data);
            $res_obj = postData($url,$data,true);
            return ($res_obj);
        }else {
            $data = array('image' => new CURLFile(realpath($image_path)));
            //var_dump($data);
            $res_obj = postData($url,$data,true);
            return ($res_obj);
}
    }else{
        return(false);
    }
}

/*
Detect all faces in one image

:param image_path: image url
:return: a json string
    Example:
    {'faces': [{'bottom': 270,
       'faceId': 'face_1ceae97e-16aa-11e7-b31b-0242ac120003',
       'faceness': 1.9446442760957594,
       'imageHeight': 610,
       'imageWidth': 920,
       'left': 581,
       'right': 617,
       'top': 234},
      ......
      {'bottom': 270,
       'faceId': 'face_1ceaf536-16aa-11e7-b31b-0242ac120003',
       'faceness': 0.7359679378999586,
       'imageHeight': 610,
       'imageWidth': 920,
       'left': 709,
       'right': 745,
       'top': 234}]}
*/
function detect_face_url($image_url){
    $url = _get_api_url('facedetect');
//    if(_is_valid_url($image_url) !== false){
        $data = array('im_uri' => $image_url);
        $url .='&' . http_build_query($data);
        $res_obj = getUrl($url);
        return ($res_obj);
//    }else{
//        return(false);
//    }
}

/*
Compare two faces specified by two face IDs.
Face ID is an unique face ID stored in the web service; each face region has one unique face ID.

:param face_id1: face ID 1;
:param face_id2: face ID 2; unique face ID stored in the web service; each face region has one unique face ID
:return: a json string
    Example:  {'samePerson': False, 'similarity': 0.06835506118690104}
*/
function compare_face($face_id1='', $face_id2=''){
    $api_str = "facecompare/{$face_id1}/{$face_id2}";
    $url = _get_api_url($api_str);
    $res_obj = getUrl($url);
    return ($res_obj);
}

/*
Identify the person by face given by face ID

:param face_id: unique face ID stored in the web service; each face region has one unique face ID
:return: a json string
    Example:
    {'identified': False,
     'maxSimilarity': 0.6239015522991999,
     'mostSimilarPersonId': 'ABC Name',
     'mostSimilarPersonName': 'ABC Name',
     'runnerUp': {'name': 'ABC Name',
     'personId': 'ABC Name',
     'similarity': 0.6227304127331807}}
*/
function identify_face($face_id){
    $api_str = "faceidentify/{$face_id}";
    $url = _get_api_url($api_str);

    $res_obj = getUrl($url);
    return ($res_obj);
}


/*
Link a person to a face. Also known as 'label a face'.

:param person_id: person ID given by user
:param face_id: unique face ID stored in the web service; each face region has one unique face ID

:return: A json string
    Example:  {'success': True}
*/
function link_person_to_face($person_id, $face_id){
    $url = _get_api_url('labelface');
    $data = array('faceId' => $face_id ,'personId' => $person_id);

    $res_obj = postData($url, $data,true);
    return ($res_obj);
}

/*
Use 'person_id' to find all face IDs associated (linked) with this person in the system.

:param person_id: person ID given by user
:return: A json string
    Example:
    [{'faceId': 'face_d8a68c48-0649-11e7-9e73-0242ac120003',
      'personId': 'Person Name'},
     .................
     {'faceId': 'face_d372c18c-16ad-11e7-b31b-0242ac120003',
      'personId': 'Person Name'}]
*/
function find_person_labels($person_id){
    $api_str = "person/{$person_id}/facelabels";
    $url = _get_api_url($api_str);
    $res_obj = getUrl($url);

    return ($res_obj);
}

function api_detect_face($input_file) {
    $res_obj = detect_face_local($input_file);
    return($res_obj);
}


/*function update_person_image($personID, $source_file, $cut_left,$cut_right, $cut_top, $cut_bottom)
{
    $source_info = getimagesize($source_file);
    $source_width = $source_info[0];
    $source_height = $source_info[1];
    $source_mime = $source_info['mime'];
    $target_height = $target_width = 100;

    $cut_x = $cut_left;
    $cut_y = $cut_top;
    $cut_width = ($cut_right - $cut_left);
    $cut_height = ($cut_bottom - $cut_top );

    switch ($source_mime)
    {
        case 'image/gif':
            $source_image = imagecreatefromgif($source_file);
        break;

        case 'image/jpeg':
            $source_image = imagecreatefromjpeg($source_file);
        break;

        case 'image/png':
            $source_image = imagecreatefrompng($source_file);
        break;

        default:
            return false;
        
    }
    $target_image = imagecreatetruecolor($target_width, $target_height);

    imagecopyresampled($target_image, $source_image, 0,0, $cut_x, $cut_y, 
                       $target_width, $target_height, $cut_height, $cut_width);

    $fileName = $personID .".face.png";
    $loacl_file_dir="/var/www/html/owncloud/data/admin/files";

    //this functin should be chagne, if there is alread a same file
    imagepng($target_image,$loacl_file_dir.'/'.$fileName);

}
*/
/*Resize image into '/owncloud/data/admin/resize_upload_image'*/
function resize_upload_image($source_file_path)
{   
    if( ($test = abs(filesize($source_file_path))) <= 700000)
    {           
        return $source_file_path;
    }
    $local_path = '/var/www/html/owncloud/data/admin/resize_upload_image/';
    if(!($dh = opendir($local_path))){
        mkdir($local_path);
    }
    closedir($dh);
    $source_info = getimagesize($source_file_path);
    $source_mime = $source_info['mime'];   
    switch ($source_mime)
    {
        case 'image/gif':
            $source_image = imagecreatefromgif($source_file_path);
        break;
        /*if the image is made by iphone,we should change this*/
        case 'image/jpeg':        
        $data = imagecreatefromstring(file_get_contents($source_file_path));
        $exif = exif_read_data($source_file_path, 'EXIF',0);
        if(!empty($exif['Orientation'])) {
          switch($exif['Orientation']) {
                  case 8:
                  $data = imagerotate($data, 90, 0);
                  break;
                  case 3:
                  $data = imagerotate($data, 180, 0);
                  break;
                  case 6:
                  $data = imagerotate($data, -90, 0);
                  break;
                  }
          imagejpeg($data, $source_file_path);
          }
        $source_image = imagecreatefromjpeg($source_file_path);  
        break;

        case 'image/png':
            $source_image = imagecreatefrompng($source_file_path);
        break;

        default:
            return false;
        
    }
    
    $source_info = getimagesize($source_file_path);
    $source_width = $source_info[0];
    $source_height = $source_info[1];
    $source_ratio = ($source_height/$source_width);
    $target_width = 300;
    $target_height = $target_width*$source_ratio; 
    
    $target_image = imagecreatetruecolor($target_width, $target_height);

    imagecopyresampled($target_image, $source_image, 0,0, 0, 0, 
                       $target_width, $target_height, $source_width, $source_height);
    $file_parts = explode('/',$source_file_path);
    $fileName = $file_parts[(count($file_parts)-1)];
    $fileName = explode('.',$fileName);
    $fileName = $fileName[0];
        switch ($source_mime)
    {
        case 'image/gif':
        $fileName = $fileName .".gif";
        imagegif($target_image,$local_path.$fileName);     
        break;

        case 'image/jpeg':
        $fileName = $fileName .".jpg";
        imagejpeg($target_image,$local_path.$fileName);  
        break;

        case 'image/png':
        $fileName = $fileName .".png";
        imagepng($target_image,$local_path.$fileName);   
        break;

        default:
            return false;
        
    }
    //this functin should be chagne, if there is alread a same file
    return ($local_path.$fileName);
}

function resize_image($file_id, $source_file)
{
    $source_info = getimagesize($source_file);
    $source_width = $source_info[0];
    $source_height = $source_info[1];
    $source_mime = $source_info['mime'];
    $target_height = $target_width = 300;
    if($source_width > $source_height){
        $cut_x = ($source_width - $source_height)*0.5;
        $cut_y = 0;
        $cut_width = $source_height;
        $cut_height = $source_height;
    }
    else {
        $cut_y = ($source_height - $source_width)*0.5;
        $cut_x = 0;
        $cut_width = $source_width;
        $cut_height = $source_width;
    }

    switch ($source_mime)
    {
        case 'image/gif':
            $source_image = imagecreatefromgif($source_file);
        break;

        case 'image/jpeg':
            $source_image = imagecreatefromjpeg($source_file);
        break;

        case 'image/png':
            $source_image = imagecreatefrompng($source_file);
        break;

        default:
            return false;
        
    }
    $target_image = imagecreatetruecolor($target_width, $target_height);

    imagecopyresampled($target_image, $source_image, 0,0, $cut_x, $cut_y, 
                       $target_width, $target_height, $cut_height, $cut_width);

    $fileName = $file_id .".png";
    $loacl_file_dir="/var/www/html/owncloud/data/admin/resize_image";

    //this functin should be chagne, if there is alread a same file
    imagepng($target_image,$loacl_file_dir.'/'.$fileName);

}

/*cut face image*/
function update_person_image($personID, $source_file, $resize_file, $cut_left, $cut_right, $cut_top, $cut_bottom)
{   
    $resize_info = getimagesize($resize_file);
    $source_info = getimagesize($source_file);
    $source_width = $source_info[0];
    $source_height = $source_info[1];
    $source_mime = $source_info['mime'];
    $resize_width = $resize_info[0];
    $source_ratio = ($source_height/$source_width);
    $source_resize = $source_width/$resize_width;

    $target_height = $target_width = 100;
    $cut_left   = $cut_left * $source_resize;
    $cut_right  = $cut_right * $source_resize;
    $cut_top    = $cut_top * $source_resize;
    $cut_bottom = $cut_bottom * $source_resize;
    $cut_x = $cut_left;
    $cut_y = $cut_top;
    $cut_width = ($cut_right - $cut_left);
    $cut_height = ($cut_bottom - $cut_top );

    switch ($source_mime)
    {
        case 'image/gif':
            $source_image = imagecreatefromgif($source_file);
        break;

        case 'image/jpeg':
            $source_image = imagecreatefromjpeg($source_file);
        break;

        case 'image/png':
            $source_image = imagecreatefrompng($source_file);
        break;

        default:
            return false;
        
    }
    $target_image = imagecreatetruecolor($target_width, $target_height);

    imagecopyresampled($target_image, $source_image, 0,0, $cut_x, $cut_y, 
                       $target_width, $target_height, $cut_height, $cut_width);

    $fileName = $personID .".face.png";
    $loacl_file_dir="/var/www/html/owncloud/data/admin/files";

    //this functin should be chagne, if there is alread a same file
    imagepng($target_image,$loacl_file_dir.'/'.$fileName);

}

$loacl_file_dir='/var/www/html/owncloud/data/admin/files';

/*find the person's face image, the file should be personId.face.png*/
function getFaceFileList($dir, $ext="face.png"){   
    $dp = opendir($dir);
    $fileArr = array();
    while (!false == $curFile = readdir($dp)) {
        if ($curFile!="." && $curFile!=".." && $curFile!="") {
            //the system need whole path or realpath($curFile)
            if (is_dir($dir."/".$curFile)) {
               $fileArr = array_merge($fileArr, getFaceFileList($dir."/".$curFile));
            } else {
                $file_parts = explode('.',$curFile); 
                $file_ext1 = strtolower(array_pop($file_parts));
                $file_ext2 = strtolower(array_pop($file_parts));  
                if ($file_ext1 === 'png' && $file_ext2 === 'face') {
                    array_push($fileArr, $curFile); 
                }                                                                     
            }
        }
    }
    closedir($dp);
    return $fileArr;
}

/*get the json file which include persinID, name and files*/
function getPersonJson($dir, $name){
    $dp = opendir($dir);
    //$fileArr = array();
    $file = "";
    while (!false == $curFile = readdir($dp)) {
        if ($curFile!="." && $curFile!=".." && $curFile!="") {
            if (is_dir($dir."/".$curFile)) {
               if(($file = getPersonJson($dir."/".$curFile,$name)) != "") {
                    closedir($dp);
                    return $file;
               }                              
            } else {
                if ($curFile === $name.".person.json") {
                    $file = $dir.'/'.$curFile;
                    closedir($dp);
                    return $file;
                }                                                                     
            }
        }
    }
    
    closedir($dp);
    return $file;
}

/*get the faceThumbnail file which include persinID, name and files*/
function getFaceThumbnail($dir, $name){
    $dp = opendir($dir);
    //$fileArr = array();
    $file = "";
    while (!false == $curFile = readdir($dp)) {
        if ($curFile!="." && $curFile!=".." && $curFile!="") {
            if (is_dir($dir."/".$curFile)) {
               if($file = getFaceThumbnail($dir."/".$curFile,$name) != "") {
                    closedir($dp);
                    return $file;
               }                              
            } else {
                if ($curFile === $name.".face.png") {
                    $file = $dir.'/'.$curFile;
                    closedir($dp);
                    return $file;
                }                                                                     
            }
        }
    }
    
    closedir($dp);
    return $file;
}

/*with default the person is "??xxxx", */
function tagPerson($dir, $oldName, $newName,$personID){
    $loacl_file_dir="/var/www/html/owncloud/data/admin/files";
    $choosed = $loacl_file_dir."/"."Choosed_face.json";
    $json_choosed = file_get_contents($choosed);
    $json_choosed = json_decode($json_choosed, true);
    $check_name = $personID.'.'.$oldName;
    $faceimage = getFaceThumbnail($dir, $check_name);
    if ($faceimage !== ""){
            $file_parts = explode('.',$faceimage); 
            $file_ext1 =$file_parts[3];
            $file_ext2 =$file_parts[2];
            $file_ext3 =$file_parts[1];
            $file_ext4 =$file_parts[0];
            rename($file_ext4.'.'.$oldName.".face.png", 
                    $file_ext4.'.'.$newName.".face.png");
            $file_personid = explode('/',$file_ext4); 
            $before_name = $file_personid[8].'.'.$oldName.".face.png";
            $after_name = $file_personid[8].'.'.$newName.".face.png";
            $key = array_search($before_name, $json_choosed);
            if ($key === false)
                return false;
            $json_choosed[$key] = $after_name;
            $json_choosed = json_encode($json_choosed);
             file_put_contents($choosed, $json_choosed);
    }                 
    else
        return false;
        
        
    if(add_person($newName, $personID))
       return true;
       
    return false;        
}

/*return the thumbnail*/
function getFaceImage($dir, $file) {
    $dp = opendir($dir);
    $tmp = $file;
    $thumbnail = "";
    while (!false == $curFile = readdir($dp)) {
        if ($curFile!="." && $curFile!=".." && $curFile!="") {
            if (is_dir($dir."/".$curFile)) {
               if($tmp = getFaceImage($dir."/".$curFile,$file)) {
                    closedir($dp);
                    return $tmp;
               }                              
            } else {
                if ($curFile === $file) {                    
                    closedir($dp);
                    return ($dir."/".$curFile);
                }                                                                     
            }    
        }
    }
    
    return $thumbnail; 
}

/*create, add, delete file from/to personId.person.json*/
/* 
{   "personId" : "xxx string",
    "files"    : [ 
                    { id   : xxx,
                      file :"xx1.person.json"
                    }, 
                    { id   : xxx,
                      file :"xx2.person.json" 
                    }
                 ]                                 
}
*/  
function api_add_person_file ($path, $name, $personId, $fileId, $mode) {
    $person_file = dirname($path);
    $person_file = $person_file."/".$personId.".person.json";
    switch ($mode) {
        //ceate xxx.person.json
        case 0:             
            $fp = fopen($person_file, "w+");
            if (!is_writable($person_file)) {
                return false;
            }
            
            $data = array('personId' => $personId, 'files' => array());
            $data = json_encode($data);
            fwrite($fp, $data); 
            fclose($fp);
            api_add_person_file($path, $name, $personId, $fileId, 1);
            break;
            
        //add image file to xxx.person.json 
        case 1:
            $json = file_get_contents($person_file);
            
            //create new file
            if(!$json) {
               api_add_person_file($path, $name, $personId, $fileId, 0);
               $json = file_get_contents($person_file); 
            }
               
            $json = json_decode($json, true);                       
            if ($personId != $json['personId'])
                return false;
                
            //the file is already here.
            $number = count($json['files']);
            for($ii = 0 ; $ii < $number; $ii++) {
                if($fileId === $json['files'][$ii]['id'])
                    return true;
            }
            
            //$tmp =  ($json['files']);
            array_push($json['files'], array('id' => $fileId, 'file' => $path));
            //array_push($json['files'], $path);
              
            $json = json_encode($json);
            file_put_contents($person_file, $json);                        
            break;             
          
        //remove image file from xxx.person.json
        //delete xxx.person.json if there is no image file.
        case 2:
            $json = file_get_contents($person_file);
            $json = json_decode($json, true);
            if ($personId != $json['personId']) 
                return false;         
                   
            $file_count = count($json['files']);
            if (!$file_count) {
                 unlink($person_file);
                 return true;
            }
            
            $index = array_search(array('id' => $fileId, 'file' => $path), $json['files']);
            if ($index !== false)
                array_splice($json['files'], $index, 1);
                
            
            /*for ($ii=0; $ii<$file_count; $ii++) {
                if ($json['files'][$ii][$fileName] == $person_file) {
                    unset($json['files'][$ii]);
                    array_values($json);
                    break;                   
                } 
            }               
            if ($ii == 0) {
                unlink($person_file);
                return true;
            } */
                
            $json = json_encode($json);
            file_put_contents($person_file, $json);            
            break;
            
        default:
            return false;    
    }
    
    return true;
    
}

function add_faceimage_2json($filename) {
    $loacl_file_dir="/var/www/html/owncloud/data/admin/files";
    $filename = $filename.'.'."face".'.'."png";
    $choosed = $loacl_file_dir."/"."Choosed_face.json";
    $remaining = $loacl_file_dir."/"."remaining_face.json";
    $json_choosed = file_get_contents($choosed);
    $json_remaining = file_get_contents($remaining);
            if(!$json_remaining) {
                    $fp = fopen($remaining, "w+");
                    if (!is_writable($remaining)) {
                            return false;
                    }
            
                    $remaining_data = array($filename);
                    $remaining_data = json_encode($remaining_data);
                    fwrite($fp, $remaining_data); 
                    fclose($fp);
                    return true; 
            }
            if(!$json_choosed) {
                    $fp = fopen($choosed, "w+");
                    if (!is_writable($choosed)) {
                            return false;
                    }
                    $choosed_data = array();
                    $choosed_data = json_encode($choosed_data);
                    fwrite($fp, $choosed_data); 
                    fclose($fp); 
            }
    $json_choosed = json_decode($json_choosed, true);
    $json_remaining = json_decode($json_remaining, true);
    $number = count($json_remaining);
            for($ii = 0 ; $ii < $number; $ii++) {
                if($filename === $json_remaining[$ii])
                    return true;
            }
    $number_choosed = count($json_choosed);
            for($jj = 0 ; $jj < $number_choosed; $jj++) {
                if($filename === $json_choosed[$jj])
                    return true;
            }
            array_push($json_remaining, $filename);
            //array_push($json['files'], $path);  
            $json_remaining = json_encode($json_remaining);
            file_put_contents($remaining, $json_remaining);
                
            return true;
}

