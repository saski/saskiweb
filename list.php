<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1" />
<title>dir list</title>
<style type="text/css">
<!--
body {
    font-family: Verdana, Arial, Helvetica, sans-serif;
    font-size: 11px;
    font-style: normal;
    font-weight: normal;
    font-variant: normal;
    text-transform: none;
    color: #333333;
    text-decoration: none;
    padding: 20px;
}
img {
    border: 0px;
}
a {
    color: #333333;
    text-decoration: none;
}
a:hover {
    color: #0066FF;
}

-->
</style>
</head>
<body>

<?

// install variables

    $host = "http://www.orosandrei.ro/download/"; // the folder where index.php is located
    // path for folder, file, buttons(back and home) images
    $img_back="http://www.orosandrei.ro/images/back.gif";
    $img_folder="http://www.orosandrei.ro/images/folder.gif";
    $img_file="http://www.orosandrei.ro/images/file.gif";
    $img_home="http://www.orosandrei.ro/images/home.gif";

// end of install variables


// returns the extension of a file
function strip_ext($name)
{           
         $ext = substr($name, strlen($ext)-4, 4);
           if(strpos($ext,'.') === false) // if we have a folder element
           {
               return "    "; // we return a string of space characters for later sort,
                             // so that the folder items remain on the first positions
           }
           return $ext; // if we have a file we return the extension - .gif, .jpg, etc.
}



// returns the files from the $path and returns them in an array
function getFiles($path) {

   $files = array();
   $fileNames = array();
   $i = 0;
   // build
   if (is_dir($path)) {
       if ($dh = opendir($path)) {
           while (($file = readdir($dh)) !== false) {
               if (($file == ".") || ($file == "..")) continue;
               $fullpath = $path . "/" . $file;
               //$fkey = strtolower($file);
               $fkey = $file;
               while (array_key_exists($fkey,$fileNames)) $fkey .= " ";
               $a = stat($fullpath);
               $files[$fkey]['size'] = $a['size'];
               if ($a['size'] == 0) $files[$fkey]['sizetext'] = "-";
               else if ($a['size'] > 1024 && $a['size'] <= 1024*1024) $files[$fkey]['sizetext'] = (ceil($a['size']/1024*100)/100) . " K";
               else if ($a['size'] > 1024*1024) $files[$fkey]['sizetext'] = (ceil($a['size']/(1024*1024)*100)/100) . " Mb";
               else $files[$fkey]['sizetext'] = $a['size'] . " bytes";
               $files[$fkey]['name'] = $file;
               $e = strip_ext($file); // $e is the extension - for example, .gif
               $files[$fkey]['type'] = filetype($fullpath); // file, dir, etc
               $k=$e.$file; // we use this string for sorting the array elements by extension and filename;
               $fileNames[$i++] = $k;
           }
           closedir($dh);
       } else die ("Cannot open directory:  $path");
   } else die ("Path is not a directory:  $path");
   sort($fileNames,SORT_STRING); // sorting
   $sortedFiles = array();
   $i = 0;
   foreach($fileNames as $f) {
           $f = substr($f, 4, strlen($f)-4); // we remove the extension we added in front of the filename for sorting
           if($files[$f]['name'] !='') $sortedFiles[$i++] = $files[$f];   
    }// ends the foreach where we build the final sorted array
   return $sortedFiles;
}


// folder navigation code
$startdir = "./";
if(isset($_GET['dir'])) {
    $prev = $_GET['dir'];
    $folder = $_GET['dir'];   
    echo "<a href=\"javascript:history.go(-1)\"><img src=\"$img_back\"></a>   <a href=\"$host\"><img src=\"$img_home\"></a> <br/><br/>";
} else { $folder = $startdir; $prev='';}
// end folder navigation code


$files = getFiles($folder);

foreach ($files as $file) {
    if(strip_ext($file[name])!='.php'){
        $image = $img_file;
        if($file[type]=='dir') {
            $image = $img_folder;
            $cmd='?dir='.$prev.$file[name].'/';
        }// if the element is a directory
        else $cmd=$prev.$file[name];
        echo "<a href=\"$cmd\" title=\"$file[type],  $file[sizetext]\"><img src=\"$image\" /> $file[name]</a> <br/>";
    }//if strip_ext
}//foreach
?>

</body>
</html>