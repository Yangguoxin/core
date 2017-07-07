/* global Album, GalleryImage */
(function ($, OC, t) {
	"use strict";
	var Gallery = {
		currentAlbum: null,
		currentEtag: null,
		config: {},
		/** Map of the whole gallery, built as we navigate through folders */
		albumMap: {},
		/** Used to pick an image based on the URL */
		imageMap: {},
		appName: 'gallery',
		token: undefined,
		activeSlideShow: null,
		buttonsWidth: 600,
		browserToolbarHeight: 150,
		filesClient: null,
        faceflag : false,
        /*files_id is a global array that store files_id about face pictures*/
        files_id : new Array(),
        files_index : new Array(),
	    dateimage : new Array(),
        GlobalPath : '',
        /*image_result is a global variable that store pictures about faces */
        image_result : 0,
         
		/**
		 * Refreshes the view and starts the slideshow if required
		 *
		 * @param {string} path
		 * @param {string} albumPath
		 */
		refresh: function (path, albumPath) {
			if (Gallery.currentAlbum !== albumPath) {
				Gallery.view.init(albumPath, null);
			}

			// If the path is mapped, that means that it's an albumPath
			if (Gallery.albumMap[path]) {
				if (Gallery.activeSlideShow) {
					Gallery.activeSlideShow.stop();
				}
			} else if (Gallery.imageMap[path] && Gallery.activeSlideShow.active === false) {
				Gallery.view.startSlideshow(path, albumPath);
			}
		},

		/**
		 * Retrieves information about all the images and albums located in the current folder
		 *
		 * @param {string} currentLocation
		 *
		 * @returns {*}
		 */
		getFiles: function (currentLocation) {
			// Cache the sorting order of the current album before loading new files
			if (!$.isEmptyObject(Gallery.albumMap)) {
				Gallery.albumMap[Gallery.currentAlbum].sorting = Gallery.config.albumSorting;
			}
			// Checks if we've visited this location before ands saves the etag to use for
			// comparison later
			var albumEtag;
			var albumCache = Gallery.albumMap[decodeURIComponent(currentLocation)];
			if (!$.isEmptyObject(albumCache)) {
				albumEtag = albumCache.etag;
			}

			// Sends the request to the server
			var params = {
				location: currentLocation,
				mediatypes: Gallery.config.getMediaTypes(),
				features: Gallery.config.getFeatures(),
				etag: albumEtag
			};
			// Only use the folder as a GET parameter and not as part of the URL
			var url = Gallery.utility.buildGalleryUrl('files', '/list', params);
			return $.getJSON(url).then(
				function (/**@type{{
					* files:Array,
					* albums:Array,
					* albumconfig:Object,
					* albumpath:String,
					* updated:Boolean}}*/
						  data) {
					var albumpath = data.albumpath;
					var updated = data.updated;
					// FIXME albumConfig should be cached as well
					/**@type {{design,information,sorting,error: string}}*/
					var albumConfig = data.albumconfig;
					//Gallery.config.setAlbumPermissions(currentAlbum);
					Gallery.config.setAlbumConfig(albumConfig, albumpath);
					// Both the folder and the etag have to match
					if ((decodeURIComponent(currentLocation) === albumpath) &&
						(updated === false)) {
						Gallery.imageMap = albumCache.imageMap;
					} else {
						Gallery._mapFiles(data);
					}

					// Restore the previous sorting order for this album
					if (!$.isEmptyObject(Gallery.albumMap[albumpath].sorting)) {
						Gallery.config.updateAlbumSorting(
							Gallery.albumMap[albumpath].sorting);
					}

				}, function (xhr) {
					var result = xhr.responseJSON;
					var albumPath = decodeURIComponent(currentLocation);
					var message;
					if (result === null) {
						message = t('gallery', 'There was a problem reading files from this album');
					} else {
						message = result.message;
					}
					Gallery.view.init(albumPath, message);
					Gallery._mapStructure(albumPath);
				});
		},

		/**
		 * Sorts albums and images based on user preferences
		 */
		sorter: function () {
			var sortType = 'name';
			var sortOrder = 'asc';
			var albumSortType = 'name';
			var albumSortOrder = 'asc';
			if (this.id === 'sort-date-button') {
				sortType = 'date';

			}
			var currentSort = Gallery.config.albumSorting;
			if (currentSort.type === sortType && currentSort.order === sortOrder) {
				sortOrder = 'des';
			}

			// Update the controls
			Gallery.view.sortControlsSetup(sortType, sortOrder);

			// We can't currently sort by album creation time
			if (sortType === 'name') {
				albumSortOrder = sortOrder;
			}

			// FIXME Rendering is still happening while we're sorting...

			// Clear before sorting
			Gallery.view.clear();

			// Sort the images
			Gallery.albumMap[Gallery.currentAlbum].images.sort(Gallery.utility.sortBy(sortType,
				sortOrder));
			Gallery.albumMap[Gallery.currentAlbum].subAlbums.sort(
				Gallery.utility.sortBy(albumSortType,
					albumSortOrder));

			// Save the new settings
			var sortConfig = {
				type: sortType,
				order: sortOrder,
				albumOrder: albumSortOrder
			};
			Gallery.config.updateAlbumSorting(sortConfig);

			// Refresh the view
			Gallery.view.viewAlbum(Gallery.currentAlbum);
		},

        /*request searching*/
        getSearch: function () {
            // Sends the request to the server
            $('#face_display>div').remove();
            $('#face_display>input').remove();
            $('#face_display>p').remove();
            $('#face_display>span').remove();
            var baseUrl = OC.generateUrl('apps/gallery/files/suggest/');

            if (($('#face-input').val().length) === 0){
                var search_url = baseUrl + "**1**" + '?' + "search=" + "**1**";
                /*when search value is empty,dispaly all image*/
                    Gallery.image_result = 0;
                    Gallery.faceflag = false; 
                    Gallery.view.viewAlbum(Gallery.GlobalPath);
            }
            else{
                var search_url = baseUrl + $('#face-input').val() + '?' + "search=" + $('#face-input').val();
            }
            $.ajax ({
                type: 'GET',
                url: search_url,
                dataType : 'json',
                beforeSend:function(){
                $('#face-input').attr({"disabled":"disabled"});
                $('#face-button').attr({"disabled":"disabled"});    
                }, 
                success : function(data){
                    //alert(data);
                    $('#face-input').removeAttr("disabled");
                    $('#face-button').removeAttr("disabled");                    
                    $('#face_display>p').remove();
                    Gallery.get_face_imge(data); 
                },
                error : function(data) {
                    $('#face-input').removeAttr("disabled");
                    $('#face-button').removeAttr("disabled");
                    alert("请输入需要查询的id");         
                }
                
            }); 
            
        },
                /*received facelist and post faceimge request*/
        get_face_imge: function(list) {
            var face_list = list;
            var i ;
            if(face_list.length <= 0)
                return false;
            var params = {
                face_list: face_list.join(';')
            };
            var person_title = document.createElement("p");
            person_title.innerHTML = "人物";
            person_title.className = "person_title";
            var myDiv = document.getElementById('face_display'); 
            myDiv.appendChild(person_title);
            var url =Gallery.utility.buildGalleryUrl('faceThumbnails', '', params);
            var eventSource = new Gallery.EventSource(url);
                eventSource.listen('preview',function (/**{filesname, status, mimetype, preview}*/ preview) {
                /*Create a Label 'div' to incase 'input image' as face*/   
                    var block_image = document.createElement("div");
                    var bigImg = document.createElement("input");
                    var name_tag = document.createElement("p");
                     // block_image.style = "display: inline-block";
                      block_image.className = "block_style";
                      bigImg.setAttribute("type","image"); 
                      bigImg.setAttribute("class","face");   
                      bigImg.src=('data:' + preview.mimetype + ';base64,' + preview.preview);
                      block_image.setAttribute("id",preview.filesname); 
                      block_image.setAttribute("name",preview.name);
                      name_tag.innerHTML = preview.name;
                      name_tag.className = "text_style";
                      name_tag.setAttribute("style","display: none");
                    var myDiv = document.getElementById('face_display'); 
                      myDiv.appendChild(block_image);                      
                      block_image.appendChild(bigImg);
                      block_image.appendChild(name_tag);                       
                });
             
                
        },
        get_result: function(){
                    /*clear Label unless clicked one include 'p','span','input'*/
                    $('div.add_face_photos_add').remove();
                    $('#face_display>div').remove();
                    $(this).siblings().remove();
                    $('#gallery_image').css('text-align','center');
                    $('#gallery').css('display','block');
                    var personID = $(this).attr("id");
                    var name = $(this).attr("name");
                    var back_add_container  = document.createElement("div");
                    var back_add_button     = document.createElement("input");
            
                    back_add_container.setAttribute("id","back_add_container");
                    back_add_button.setAttribute("value","返回");
                    back_add_button.className = "button_back_add";
                    back_add_button.setAttribute("id","button_back_add");
                    back_add_button.setAttribute("type","button");            
                    var display_myDiv = document.getElementById('face_display'); 
                    display_myDiv.appendChild(back_add_container);
                    back_add_container.appendChild(back_add_button);
                    
                    /*creat Label 'p'*/
                    var prefile = document.createElement("p");
                        prefile.innerHTML = name;
                        var myDiv = document.getElementById('gallery_image');
                        myDiv.appendChild(prefile);
                    var static_name = document.createElement("span");
                        static_name.innerHTML = "NewName:  ";
                        myDiv.appendChild(static_name);
                    var name_edit = document.createElement("input");
                        name_edit.type = 'text';
                        name_edit.placeholder = 'name or personID';
                        myDiv.appendChild(name_edit);
                    var button = document.createElement("input");
                        button.setAttribute("id","button_set_name");
                        button.type = 'button';
                        button.value = '修改'  ;
                        myDiv.appendChild(button);
                              
                    var params = {
                    personID: personID
                    };
                    var url =Gallery.utility.buildGalleryUrl('files', '/person', params);
                    $.ajax ({
                        type: 'GET',
                        url: url,
                        dataType : 'json', 
                        success : function(data){
                            var i,fileslength = data.files.length;
                            /*Clear array files_id*/
                            Gallery.files_id = [];
                            for(i=0;i<fileslength;i++){
                                 Gallery.files_id[i]= data.files[i].id;
                            }
                            /*Change faceflag to true */ 
                            Gallery.files_index = [];  
                            Gallery.faceflag = true; 
                            Gallery.view.viewAlbum(Gallery.GlobalPath);     
                                },
                        error : function(data) {
                                alert(data);         
                                }
                                
                
            });
        },
        
        set_personID: function(){
            var newName = $("#gallery_image").children(":text").val();
            var oldName = $("#gallery_image").children("div").attr("name");
            var personID = $("#gallery_image").children("div").attr("id");
            if (newName === ""){
                       alert("请输入需要命名的名字，输入空错误");
                       return false;
            }
            else{
                    var params = {
                        newName: newName,
                        oldName: oldName,
                        personID: personID
                    };
                    var url =Gallery.utility.buildGalleryUrl('files', '/setName', params);
                    $.ajax ({
                        type: 'GET',
                        url: url,
                        dataType : 'json', 
                        success : function(data){
                                var div_doc = document.getElementById(personID);
                                    div_doc.setAttribute("name",newName);
                                    $('#gallery_image>p').html(newName);                      
                                 
                                },
                        error : function(data) {
                                alert(data);         
                                }
                
                    });
            } 
            
        },
        
        //set_mouseover: function(){
            /*set tag when mouse foucsed on image*/
        //    $(this).children("p").remove();
        //    var personID = $(this).attr("id");
        //    var name_tag = document.createElement("p");
        //            name_tag.innerHTML = $(this).attr("name");
        //            name_tag.className = "text_style";
        //            name_tag.setAttribute("style","display: block");
        //            document.getElementById(personID).appendChild(name_tag);    
        //},
        /*
        set_mouseleave: function(){
            $(this).children("p").remove();
        },
        */
        Enter_key_up : function(){
            var e = window.event || arguments.callee.caller.arguments[0];
            if (e && e.keyCode == 13 ) {
             Gallery.getSearch();
         }
        },
        
        gallery_clean: function(){
            Gallery.files_id = [];
            Gallery.faceflag = true;
            Gallery.view.viewAlbum(Gallery.GlobalPath);
        },        
        
        gallery_load_frame : function(){
            /*array_frame is ["id","class","id","class","str","class"]*/
            var tmp_width = (window.innerWidth/2) ;
            
            
            
            var frame_array = [ ["all_photos","Photo_frame","all_photos_child","Photo_frame_child","所有照片","Photo_text_style"],
                                ["people_photos","Photo_frame","people_photos_child","Photo_frame_child","人物","Photo_text_style"],
                                ["place_photos","Photo_frame","place_photos_child","Photo_frame_child","地点","Photo_text_style"],
                                ["collection_photos","Photo_frame","collection_photos_child","Photo_frame_child","收藏","Photo_text_style"],
            ];
            for(i=0;i<frame_array.length;i++)
            {
                var All_Photo_frame    = document.createElement("div");
                var All_Photo_frame_child    = document.createElement("div");
                var All_name_tag       = document.createElement("p");
                All_Photo_frame.setAttribute("id",frame_array[i][0]);
                All_Photo_frame.setAttribute("class",frame_array[i][1]);
                All_Photo_frame_child.setAttribute("id",frame_array[i][2]);
                All_Photo_frame_child.setAttribute("class",frame_array[i][3]);                
                All_name_tag.innerHTML = frame_array[i][4];
                All_name_tag.className = frame_array[i][5];    
                var myDiv = document.getElementById('face_display'); 
                myDiv.appendChild(All_Photo_frame);
                All_Photo_frame.appendChild(All_Photo_frame_child);
                All_Photo_frame.appendChild(All_name_tag);
                $('.Photo_frame').css('height',tmp_width);
            }
                                  
        },
        
        gallery_load_Allphotos: function(){
            var sortType = 'date';
            var sortOrder = 'asc';
            var albumSortType = 'date';
            var albumSortOrder = 'asc';
            
            // Clear before sorting
            Gallery.view.clear();

            // Sort the images
            Gallery.albumMap[Gallery.currentAlbum].images.sort(Gallery.utility.sortBy(sortType,
                sortOrder));
            Gallery.albumMap[Gallery.currentAlbum].subAlbums.sort(
                Gallery.utility.sortBy(albumSortType,
                    albumSortOrder));
                    
            var gallery_images =  Gallery.albumMap[Gallery.currentAlbum].images;
            
            var subload = new Array();
            var firidx = 0;
            subload[firidx] = new Array();               
            subload[firidx][0] = gallery_images[firidx].fileId; 
            subload[firidx][1] = gallery_images[firidx].mimeType;
            subload[firidx][2] = gallery_images[firidx].path;
                       
            if(window.dateloadimage == undefined) {
                Gallery.load_menudate_image(subload); 
            }else{
                if(window.dateloadimage.length == gallery_images.length) {
                    Gallery.view_menudate_image(window.dateloadimage[0][2],window.dateloadimage[0][4]);
                }else{
                    Gallery.load_menudate_image(subload);                
                }                
            }                               
            
        },
        
        gallery_load_peoplephotos: function(){
            
            var baseUrl = OC.generateUrl('apps/gallery/files/photos_choosed');                       
            var search_url = baseUrl + '?' + "filesname=" + "Choosed_face";
            $.ajax ({
                type: 'GET',
                url: search_url,
                dataType : 'json',
                beforeSend:function(){    
                }, 
                success : function(data){
                    if (data === null)
                    return false;
                    var data_list = data;
                    var files_list = new Array();
                    var files_length = data_list.length;
                    if(files_length === 0)
                        return false;
                    if(files_length <= 4)
                        files_list = data;
                    else{
                        for(var i=0;i < 4;i++)
                            files_list[i] = data[files_length - i -1];
                    } 
                    Gallery.get_peoplephotos_imge(files_list);
                    //alert(files_list); 
                },
                error : function(data) {
                    
                    alert("请输入需要查询的id");
                             
                }
                
            });        
            },
        
        get_peoplephotos_imge: function(list){

            var face_list = list;
            var i ;
            if(face_list.length <= 0)
                return false;
            var params = {
                face_list: face_list.join(';')
            };
            var url =Gallery.utility.buildGalleryUrl('faceThumbnails', '', params);
            var eventSource = new Gallery.EventSource(url);
                eventSource.listen('preview',function (/**{filesname, status, mimetype, preview}*/ preview) {
                /*Create a Label 'div' to incase 'input image' as face*/   
                    
            var bigImg = document.createElement("input");
            bigImg.setAttribute("type","image"); 
            bigImg.setAttribute("class","peoplephotos");   
            bigImg.src=('data:' + preview.mimetype + ';base64,' + preview.preview); 
            var myDiv = document.getElementById('people_photos_child'); 
            myDiv.appendChild(bigImg);
                                   
                });
            
        },
        
        /*This is a utility function that jumps from the main interface to the characters
        @for example
        @jump to "person photos"
        @jump to "All photos"
         */
        gallery_title_frame: function(title){
            $('#face_display>div').remove();
            $('#gallery_image>div').remove();
            $('#gallery_image').css('text-align','left');
            /*Create button in face_display*/
            var All_name_tag       = document.createElement("p");
            var All_photo_container= document.createElement("div");
            var All_photo_button   = document.createElement("input");
            All_photo_container.setAttribute("id","back_menu_container");
            All_photo_button.setAttribute("value","返回");
            All_photo_button.className = "button_back_menu";
            All_photo_button.className = "button_back_menu";
            All_photo_button.setAttribute("id","button_back_menu");
            All_photo_button.setAttribute("type","button");
            All_name_tag.innerHTML = title;
            All_name_tag.className = "person_title";
            var myDiv = document.getElementById('face_display'); 
            myDiv.appendChild(All_name_tag);
            myDiv.appendChild(All_photo_container);
            All_photo_container.appendChild(All_photo_button);   
        },
        
        gallery_add_facephotos: function(){ 
            Gallery.gallery_title_frame("人物");
            Gallery.gallery_clean();
            var baseUrl = OC.generateUrl('apps/gallery/files/photos_choosed');                       
            var search_url = baseUrl + '?' + "filesname=" + "Choosed_face";
            $.ajax ({
                type: 'GET',
                url: search_url,
                dataType : 'json',
                beforeSend:function(){    
                }, 
                success : function(data){
                    if (data === null)
                    return false; 
                    Gallery.load_add_face_imge(data);
                    //alert(files_list); 
                },
                error : function(data) {
                    
                    alert("请输入需要查询的id");
                             
                }
                
            });
            /*Add face_image into div*/
            var Add_face_photos = document.createElement("div");
            var Add_face_button = document.createElement("input");
            Add_face_photos.setAttribute("class","add_face_photos_add");
            Add_face_button.setAttribute("id","add_face_button");
            Add_face_button.setAttribute("type","image");
            Add_face_button.setAttribute("src","/owncloud/apps/gallery/img/actions/add_face_image.jpg");
            var gallery_image_Div = document.getElementById('gallery_image');
            gallery_image_Div.appendChild(Add_face_photos);
            Add_face_photos.appendChild(Add_face_button);
            var tmp_width = $('.add_face_photos_add').css('width');
            $('.add_face_photos_add').css('height',tmp_width);
        },
                            
        gallery_change_class: function(){
             var gallery_image_Div = document.getElementById($(this).attr("id"));
             gallery_image_Div.setAttribute("class","add_face_photos_choose");
             var tmp_width = $('.add_face_photos_choose').css('width');
            $('.add_face_photos_choose').css('height',tmp_width);
        },
        
        gallery_change_class_back: function(){
             var gallery_image_Div = document.getElementById($(this).attr("id"));
             gallery_image_Div.setAttribute("class","add_face_photos");
        },
        
        /*Loading face image at adding page*/        
        load_add_face_imge: function(list){

            var face_list = list;
            var i ;
            if(face_list.length <= 0)
                return false;
            var params = {
                face_list: face_list.join(';')
            };
            var url =Gallery.utility.buildGalleryUrl('faceThumbnails', '', params);
            var eventSource = new Gallery.EventSource(url);
                 eventSource.listen('preview',function (/**{filesname, status, mimetype, preview}*/ preview) {
                /*Create a Label 'div' to incase 'input image' as face*/   
                    
                    var block_image = document.createElement("div");
                    var bigImg = document.createElement("input");
                        block_image.className = "add_face_photos_display";
                        bigImg.setAttribute("type","image"); 
                        bigImg.setAttribute("class","add_load_face");   
                        bigImg.src=('data:' + preview.mimetype + ';base64,' + preview.preview);
                        block_image.setAttribute("id",preview.filesname); 
                        block_image.setAttribute("name",preview.name);
                    var myDiv = document.getElementById('gallery_image'); 
                        myDiv.appendChild(block_image);                      
                        block_image.appendChild(bigImg);
                    var tmp_width = $('.add_face_photos_display').css('width');
                    $('.add_face_photos_display').css('height',tmp_width);
                                  
                });
                     


            
        },
        
        /* Choose face image */
        gallery_choose_facephotos: function(){

            $('#face_display>div').remove();
            $('#face_display>p').remove();
            $('#gallery_image>div').remove();
            /*Create back_button and ok_button in face_display*/
            var back_add_container  = document.createElement("div");
            var ok_add_container    = document.createElement("div");
            var back_add_button     = document.createElement("input");
            var ok_add_button       = document.createElement("input");
            
            back_add_container.setAttribute("id","back_add_container");
            back_add_button.setAttribute("value","返回");
            back_add_button.className = "button_back_add";
            back_add_button.setAttribute("id","button_back_add");
            back_add_button.setAttribute("type","button");
            
            ok_add_container.setAttribute("id","ok_add_container");
            ok_add_button.setAttribute("value","确认");
            ok_add_button.className = "button_ok_add";
            ok_add_button.setAttribute("id","button_ok_add");
            ok_add_button.setAttribute("type","button");            
            var myDiv = document.getElementById('face_display'); 
                myDiv.appendChild(back_add_container);
                myDiv.appendChild(ok_add_container);
                back_add_container.appendChild(back_add_button);
                ok_add_container.appendChild(ok_add_button);
            var baseUrl = OC.generateUrl('apps/gallery/files/photos_choosed');                       
            var search_url = baseUrl + '?' + "filesname=" + "remaining_face";
            $.ajax ({
                type: 'GET',
                url: search_url,
                dataType : 'json',
                beforeSend:function(){    
                }, 
                success : function(data){
                    var data_list = data;
                    if(data === null)
                        return false;
                    Gallery.load_choose_face_imge(data_list);
                    //alert(files_list); 
                },
                error : function(data) {
                    
                    alert("请输入需要查询的id");
                             
                }
                
            });                    
        },
        
        load_choose_face_imge: function(list){

            var face_list = list;
            var i ;
            if(face_list.length <= 0)
                return false;
            var params = {
                face_list: face_list.join(';')
            };
            var url =Gallery.utility.buildGalleryUrl('faceThumbnails', '', params);
            var eventSource = new Gallery.EventSource(url);
                 eventSource.listen('preview',function (/**{filesname, status, mimetype, preview}*/ preview) {
                /*Create a Label 'div' to incase 'input image' as face*/   
                    
                    var block_image = document.createElement("div");
                    var bigImg = document.createElement("input");
                        block_image.className = "add_face_photos";
                        bigImg.setAttribute("type","image"); 
                        bigImg.setAttribute("class","add_load_face");   
                        bigImg.src=('data:' + preview.mimetype + ';base64,' + preview.preview);
                        block_image.setAttribute("id",preview.filesname); 
                        block_image.setAttribute("name",preview.name);
                    var myDiv = document.getElementById('gallery_image'); 
                        myDiv.appendChild(block_image);                      
                        block_image.appendChild(bigImg);
                        var tmp_width = $('.add_face_photos').css('width');
                        $('.add_face_photos').css('height',tmp_width);          
                });

            
        },
        
        Pick_face_2choose: function(){
                var face_list = new Array();
                var i = 0;
                $('div.add_face_photos_choose').each(function(){
                    face_list[i] = ($(this).attr("id") + '.' + $(this).attr("name") + ".face.png");
                    i++;
                    });
                if(face_list.length==0)
                    return false;
                var params = {
                face_list: face_list.join(';')
                    };
                var url =Gallery.utility.buildGalleryUrl('files', '/photos_pick', params);
                    $.ajax ({
                        type: 'GET',
                        url: url,
                        dataType : 'json', 
                        success : function(data){                      
                                Gallery.gallery_add_facephotos();
                                },
                        error : function(data) {
                                alert(data);         
                                }
                
                    });
                
             
        },
        
        /*Back button: back to choose*/
        gallery_back_2choose: function(){
                $('#face_display>div').remove();
                $('#face_display>p').remove();
                $('#gallery_image>div').remove();
                $('#gallery_image>p').remove();
                $('#gallery_image>span').remove();
                $('#gallery_image>input').remove();
                $('#gallery').css('display','none');
                Gallery.gallery_clean();
                Gallery.gallery_add_facephotos();
        },
        
        /*Back button: back to menu*/
        gallery_back_2menu: function(){
                $('#face_display>div').remove();
                $('#face_display>p').remove();
                $('#gallery_image>div').remove();
                $('#dateimage>div').remove();
                $('#gallery').css('display','none');
                Gallery.gallery_clean();
                Gallery.gallery_load_frame();
                Gallery.gallery_load_peoplephotos();
                Gallery.gallery_load_Allphotos();
                Gallery.faceflag = false;
                Gallery.image_result = 0;
        },

        loadimage_find_preview: function(image,loadimage){
            for(var i=0; i<loadimage.length; i++){
                if(image.fileId == loadimage[i][1]){
                    return [loadimage[i][2],loadimage[i][4]];
                }
            }
        },
        
        show_load_allimage: function(loadimage){        
            for(var i=0; i<Gallery.dateimage.length; i++){
                var daterow = document.createElement("div");
                var datelabel = document.createElement("p");
                daterow.setAttribute("id","daterow"+i);
                daterow.setAttribute("class","daterow");
                datelabel.setAttribute("id","p"+i);
                datelabel.setAttribute("class","datelabel");
                
                var myDiv = document.getElementById('dateimage'); 
                myDiv.appendChild(daterow);
                var myP = document.getElementById("daterow"+i);
                myP.appendChild(datelabel);
                document.getElementById("p"+i).innerText = Gallery.dateimage[i].time;
                
                var images = new Array();
                images = Gallery.dateimage[i].file;
                                                  
                for(var j=0; j<images.length; j++){
                    var image = images[j];
                    var preview = Gallery.loadimage_find_preview(image,loadimage);
                    if(preview[0]=='' || preview[1]==''){
                        continue;
                    }
                    var a_image = document.createElement("a");
                    var dateimage  = document.createElement("input");
                    dateimage.setAttribute("type","image");
                    dateimage.setAttribute("class","dateimage_element");
                    a_image.setAttribute("class","dateimage_element");
                    a_image.setAttribute("data-path",image.path);
                    a_image.setAttribute("href",'#' + encodeURIComponent(image.path));
                    dateimage.src=('data:' + preview[0] + ';base64,' + preview[1]);
                    daterow.appendChild(a_image);
                    a_image.appendChild(dateimage);
                }
                
            }              
        },

        view_menudate_image: function(mimetype,preview){
                var Img = document.createElement("input");
                Img.setAttribute("type","image"); 
                Img.setAttribute("class","datemenuphotos");   
                Img.src=('data:' + mimetype + ';base64,' + preview); 
                var myDiv = document.getElementById('all_photos_child'); 
                myDiv.appendChild(Img);             
        },
        
        load_menudate_image: function(list){

            var face_list = list;
            var i = 0;
            var fileId = 0;
            var type = 1;
                        
            if(face_list.length <= 0)
                return false;
                
            for(var idx=0; idx<face_list.length; idx++){
                face_list[idx][fileId] = face_list[idx][fileId] + '#';
                face_list[idx][type] = face_list[idx][type] + '#';
            }
            
            var params = {
                dateimg_list: face_list.join('|')
            };
            
            var url =Gallery.utility.buildGalleryUrl('datephotos', '', params);
            var eventSource = new Gallery.EventSource(url);
                 eventSource.listen('preview',function (/**{filesname, status, mimetype, preview}*/ preview) {
                         Gallery.view_menudate_image(preview.mimetype,preview.preview);    
                });                          
        },
                        
        load_alldate_imge: function(list){

            var face_list = list;
            var i = 0;
            var fileId = 0;
            var type = 1;
            if(face_list.length <= 0)
                return false;
                
            for(var idx=0; idx<face_list.length; idx++){
                face_list[idx][fileId] = face_list[idx][fileId] + '#';
                face_list[idx][type] = face_list[idx][type] + '#';
            }
            
            var params = {
                dateimg_list: face_list.join('|')
            };
            
            var dateimage = new Array();
            var url =Gallery.utility.buildGalleryUrl('datephotos', '', params);
            var eventSource = new Gallery.EventSource(url);
                 eventSource.listen('preview',function (/**{filesname, status, mimetype, preview}*/ preview) {
                     var j = 0;
                     dateimage[i] = new Array();  
                     dateimage[i][j++] = preview.status;
                     dateimage[i][j++] = preview.fileId;
                     dateimage[i][j++] = preview.mimetype;
                     dateimage[i][j++] = preview.name;
                     dateimage[i][j] = preview.preview;
                     i++;   
                     if(i >= face_list.length){
                         Gallery.show_load_allimage(dateimage);
                         window.dateloadimage = dateimage;
                     }                                
                });                          
        },
        
        TranTime: function(time) {
            //$time = strtotime($time);
            var nowTstr = new Date();
            var nowTime = nowTstr.getTime(); 
            var timeStr = new Date(time*1000);
            var message = ''; 
            //一年前
            if (nowTstr.getFullYear() != timeStr.getFullYear()) {
                message = timeStr.toLocaleDateString();
            }
            if (nowTstr.getMonth() != timeStr.getMonth()) {
                message = timeStr.toLocaleDateString();
            }            
            else {
                //同一年
                var days = nowTstr.getDate() - timeStr.getDate();
                switch(true){
                    //一天内
                    case (0 == days):
                        var seconds = Math.round(nowTime/1000) - time;
                        if (seconds < 60) {
                            message = 'Moment Ago';
                            break;
                        }
                        message = 'Today';
                        break;
                        //昨天
                    case (1 == days):
                        message = 'Yesterday';
                        break;
                    default:
                        message = timeStr.toLocaleDateString();
                        break;
                }
            }
            
            return message;
        },
        
        dateimage_class: function(images){
            var allphoto = new Array();            
            allphoto = images;
            
            var map = new Object();
            var subload = new Array();

            for(var i=0; i<allphoto.length; i++){
                var item = allphoto[i];
                var time = Gallery.TranTime(item.mTime);
                              
                subload[i] = new Array();               
                subload[i][0] = item.fileId; 
                subload[i][1] = item.mimeType;
                subload[i][2] = item.path;  
                            
                if(!map[time]){
                    var array = new Array();
                    array.push(item);
                    map[time] = {time:time,file:array};
                }else{
                    var  temp = map[time];
                    temp.file.push(item);
                    map[time] = temp;
                }
            }
            
            var resultArray = new Array();
            for(var key in map){
                resultArray.push(map[key]);
            }  
            
            Gallery.dateimage = resultArray;  
            
            return subload;        
        },
        
        gallery_add_allphotos: function(){
            var sortType = 'date';
            var sortOrder = 'asc';
            var albumSortType = 'date';
            var albumSortOrder = 'asc';
            
            $('#face_display>div').remove();
            $('#gallery_image>div').remove();
            $('#dateimage>div').remove();
            
            Gallery.gallery_title_frame("所有照片");
            // Clear before sorting
            Gallery.view.clear();

            // Sort the images
            Gallery.albumMap[Gallery.currentAlbum].images.sort(Gallery.utility.sortBy(sortType,
                sortOrder));
            Gallery.albumMap[Gallery.currentAlbum].subAlbums.sort(
                Gallery.utility.sortBy(albumSortType,
                    albumSortOrder));
                    
            // Refresh the view
            Gallery.view.viewAlbum(Gallery.currentAlbum);            

            //class images and get subload array
            var gallery_images =  Gallery.albumMap[Gallery.currentAlbum].images;
            var subload = Gallery.dateimage_class(gallery_images);
              
            //get base64 from back 
            if(window.dateloadimage == undefined) {
                Gallery.load_alldate_imge(subload); 
            }else{
                if(window.dateloadimage.length == gallery_images.length) {
                    Gallery.show_load_allimage(window.dateloadimage);
                }else{
                    Gallery.load_alldate_imge(subload);                
                }                
            }

        
            $('#dateimage').css('display','block'); 
                                
                                   
        },            
		/**
		 * Switches to the Files view
		 *
		 * @param event
		 */
		switchToFilesView: function (event) {
			event.stopPropagation();

			var subUrl = '';
			var params = {path: '/' + Gallery.currentAlbum};
			if (Gallery.token) {
				params.token = Gallery.token;
				subUrl = 's/{token}?path={path}';
			} else {
				subUrl = 'apps/files?dir={path}';
			}

			var button = $('#filelist-button');
			button.children('#button-loading').addClass('loading');
			OC.redirect(OC.generateUrl(subUrl, params));
		},

		/**
		 * Populates the share dialog with the needed information
		 *
		 * @param event
		 */
		share: function (event) {
			// Clicking on share button does not trigger automatic slide-up
			$('.album-info-container').slideUp();

			if (!Gallery.Share.droppedDown) {
				event.preventDefault();
				event.stopPropagation();

				var currentAlbum = Gallery.albumMap[Gallery.currentAlbum];
				$('a.share').data('path', currentAlbum.path)
					.data('link', true)
					.data('item-source', currentAlbum.fileId)
					.data('possible-permissions', currentAlbum.permissions)
					.click();
				if (!$('#linkCheckbox').is(':checked')) {
					$('#linkText').hide();
				}
			}
		},

		/**
		 * Sends an archive of the current folder to the browser
		 *
		 * @param event
		 */
		download: function (event) {
			event.preventDefault();

			var path = $('#content').data('albumname');
			var files = Gallery.currentAlbum;
			var downloadUrl = Gallery.utility.buildFilesUrl(path, files);

			OC.redirect(downloadUrl);
		},

		/**
		 * Shows an information box to the user
		 *
		 * @param event
		 */
		showInfo: function (event) {
			event.stopPropagation();
			Gallery.infoBox.showInfo();
		},

		/**
		 * Lets the user add the shared files to his ownCloud
		 */
		showSaveForm: function () {
			$(this).hide();
			$('.save-form').css('display', 'inline');
			$('#remote_address').focus();
		},

		/**
		 * Sends the shared files to the viewer's ownCloud
		 *
		 * @param event
		 */
		saveForm: function (event) {
			event.preventDefault();

			var saveElement = $('#save');
			var remote = $(this).find('input[type="text"]').val();
			var owner = saveElement.data('owner');
			var name = saveElement.data('name');
			var isProtected = saveElement.data('protected');
			Gallery._saveToOwnCloud(remote, Gallery.token, owner, name, isProtected);
		},

		/**
		 * Creates a new slideshow using the images found in the current folder
		 *
		 * @param {Array} images
		 * @param {string} startImage
		 * @param {boolean} autoPlay
		 *
		 * @returns {boolean}
		 */
		slideShow: function (images, startImage, autoPlay) {
			if (startImage === undefined) {
				OC.Notification.showTemporary(t('gallery',
					'Aborting preview. Could not find the file'));
				return false;
			}
			var start = images.indexOf(startImage);
			images = images.filter(function (image, index) {
				// If the slideshow is loaded before we get a thumbnail, we have to accept all
				// images
				if (!image.thumbnail) {
					return image;
				} else {
					if (image.thumbnail.valid) {
						return image;
					} else if (index < images.indexOf(startImage)) {
						start--;
					}
				}
			}).map(function (image) {
				var name = OC.basename(image.path);
				var previewUrl = Gallery.utility.getPreviewUrl(image.fileId, image.etag);
				var params = {
					c: image.etag,
					requesttoken: oc_requesttoken
				};
				var downloadUrl = Gallery.utility.buildGalleryUrl('files',
					'/download/' + image.fileId,
					params);

				return {
					name: name,
					path: image.path,
					file: image.fileId,
					mimeType: image.mimeType,
					url: previewUrl,
					downloadUrl: downloadUrl
				};
			});
			Gallery.activeSlideShow.setImages(images, autoPlay);
			Gallery.activeSlideShow.onStop = function () {
				$('#content').show();
				Gallery.view.removeLoading();
				if (Gallery.currentAlbum !== '') {
					// Only modern browsers can manipulate history
					if (history && history.replaceState) {
						history.replaceState('', '',
							'#' + encodeURIComponent(Gallery.currentAlbum));
					} else {
						location.hash = '#' + encodeURIComponent(Gallery.currentAlbum);
					}
				} else {
					// Only modern browsers can manipulate history
					if (history && history.replaceState) {
						history.replaceState('', '', '#');
					} else {
						location.hash = '#';
					}
				}
			};
			Gallery.activeSlideShow.show(start);
			if(!_.isUndefined(Gallery.Share)){
				Gallery.Share.hideDropDown();
			}
			$('.album-info-container').slideUp();
			// Resets the last focused element
			document.activeElement.blur();
		},

		/**
		 * Moves files and albums to a new location
		 *
		 * @param {jQuery} $item
		 * @param {string} fileName
		 * @param {string} filePath
		 * @param {jQuery} $target
		 * @param {string} targetPath
		 */
		move: function ($item, fileName, filePath, $target, targetPath) {
			var self = this;
			var dir = Gallery.currentAlbum;

			if (targetPath.charAt(targetPath.length - 1) !== '/') {
				// make sure we move the files into the target dir,
				// not overwrite it
				targetPath = targetPath + '/';
			}
			self.filesClient.move(dir + '/' + fileName, targetPath + fileName)
				.done(function () {
					self._removeElement(dir, filePath, $item);
				})
				.fail(function (status) {
					if (status === 412) {
						// TODO: some day here we should invoke the conflict dialog
						OC.Notification.showTemporary(
							t('gallery', 'Could not move "{file}", target exists', {file: fileName})
						);
					} else {
						OC.Notification.showTemporary(
							t('gallery', 'Could not move "{file}"', {file: fileName})
						);
					}
					$item.fadeTo("normal", 1);
					$target.children('.album-loader').hide();
				})
				.always(function () {
					// Nothing?
				});
		},

		/**
		 * Builds the album's model
		 *
		 * @param {{
		 * 	files:Array,
		 * 	albums:Array,
		 * 	albumconfig:Object,
		 * 	albumpath:String,
		 *	updated:Boolean
		 * 	}} data
		 * @private
		 */
		_mapFiles: function (data) {
			Gallery.imageMap = {};
			var image = null;
			var path = null;
			var fileId = null;
			var mimeType = null;
			var mTime = null;
			var etag = null;
			var size = null;
			var sharedWithUser = null;
			var owner = null;
			var currentLocation = data.albumpath;
			// This adds a new node to the map for each parent album
			Gallery._mapStructure(currentLocation);
			var files = data.files;
			if (files.length > 0) {
				var subAlbumCache = {};
				var albumCache = Gallery.albumMap[currentLocation]
					= new Album(
					currentLocation,
					[],
					[],
					OC.basename(currentLocation),
					data.albums[currentLocation].nodeid,
					data.albums[currentLocation].mtime,
					data.albums[currentLocation].etag,
					data.albums[currentLocation].size,
					data.albums[currentLocation].sharedwithuser,
					data.albums[currentLocation].owner,
					data.albums[currentLocation].freespace,
					data.albums[currentLocation].permissions
				);
				for (var i = 0; i < files.length; i++) {
					path = files[i].path;
					fileId = files[i].nodeid;
					mimeType = files[i].mimetype;
					mTime = files[i].mtime;
					etag = files[i].etag;
					size = files[i].size;
					sharedWithUser = files[i].sharedwithuser;
					owner = files[i].owner;

					image =
						new GalleryImage(
							path, path, fileId, mimeType, mTime, etag, size, sharedWithUser
						);

					// Determines the folder name for the image
					var dir = OC.dirname(path);
					if (dir === path) {
						dir = '';
					}
					if (dir === currentLocation) {
						// The image belongs to the current album, so we can add it directly
						albumCache.images.push(image);
					} else {
						// The image belongs to a sub-album, so we create a sub-album cache if it
						// doesn't exist and add images to it
						if (!subAlbumCache[dir]) {
							subAlbumCache[dir] = new Album(
								dir,
								[],
								[],
								OC.basename(dir),
								data.albums[dir].nodeid,
								data.albums[dir].mtime,
								data.albums[dir].etag,
								data.albums[dir].size,
								data.albums[dir].sharedwithuser,
								data.albums[currentLocation].owner,
								data.albums[currentLocation].freespace,
								data.albums[dir].permissions);
						}
						subAlbumCache[dir].images.push(image);
						// The sub-album also has to be added to the global map
						if (!Gallery.albumMap[dir]) {
							Gallery.albumMap[dir] = {};
						}
					}
					Gallery.imageMap[image.path] = image;
				}
				// Adds the sub-albums to the current album
				Gallery._mapAlbums(albumCache, subAlbumCache);

				// Caches the information which is not already cached
				albumCache.etag = data.albums[currentLocation].etag;
				albumCache.imageMap = Gallery.imageMap;
			}
		},

		/**
		 * Adds every album leading to the current folder to a global album map
		 *
		 * Per example, if you have Root/Folder1/Folder2/CurrentFolder then the map will contain:
		 *    * Root
		 *    * Folder1
		 *    * Folder2
		 *    * CurrentFolder
		 *
		 *  Every time a new location is loaded, the map is completed
		 *
		 *
		 * @param {string} path
		 *
		 * @returns {Album}
		 * @private
		 */
		_mapStructure: function (path) {
			if (!Gallery.albumMap[path]) {
				Gallery.albumMap[path] = {};
				// Builds relationships between albums
				if (path !== '') {
					var parent = OC.dirname(path);
					if (parent === path) {
						parent = '';
					}
					Gallery._mapStructure(parent);
				}
			}
			return Gallery.albumMap[path];
		},

		/**
		 * Adds the sub-albums to the current album
		 *
		 * @param {Album} albumCache
		 * @param {{Album}} subAlbumCache
		 * @private
		 */
		_mapAlbums: function (albumCache, subAlbumCache) {
			for (var j = 0, keys = Object.keys(subAlbumCache); j <
			keys.length; j++) {
				albumCache.subAlbums.push(subAlbumCache[keys[j]]);
			}
		},

		/**
		 * Saves the folder to a remote ownCloud installation
		 *
		 * Our location is the remote for the other server
		 *
		 * @param {string} remote
		 * @param {string}token
		 * @param {string}owner
		 * @param {string}name
		 * @param {boolean} isProtected
		 * @private
		 */
		_saveToOwnCloud: function (remote, token, owner, name, isProtected) {
			var location = window.location.protocol + '//' + window.location.host + OC.webroot;
			var isProtectedInt = (isProtected) ? 1 : 0;
			var url = remote + '/index.php/apps/files#' + 'remote=' + encodeURIComponent(location)
				+ "&token=" + encodeURIComponent(token) + "&owner=" + encodeURIComponent(owner) +
				"&name=" +
				encodeURIComponent(name) + "&protected=" + isProtectedInt;

			if (remote.indexOf('://') > 0) {
				OC.redirect(url);
			} else {
				// if no protocol is specified, we automatically detect it by testing https and
				// http
				// this check needs to happen on the server due to the Content Security Policy
				// directive
				$.get(OC.generateUrl('apps/files_sharing/testremote'),
					{remote: remote}).then(function (protocol) {
					if (protocol !== 'http' && protocol !== 'https') {
						OC.dialogs.alert(t('files_sharing',
							'No ownCloud installation (7 or higher) found at {remote}',
							{remote: remote}),
							t('files_sharing', 'Invalid ownCloud url'));
					} else {
						OC.redirect(protocol + '://' + url);
					}
				});
			}
		},

		/**
		 * Removes the moved element from the UI and refreshes the view
		 *
		 * @param {string} dir
		 * @param {string}filePath
		 * @param {jQuery} $item
		 * @private
		 */
		_removeElement: function (dir, filePath, $item) {
			var images = Gallery.albumMap[Gallery.currentAlbum].images;
			var albums = Gallery.albumMap[Gallery.currentAlbum].subAlbums;
			// if still viewing the same directory
			if (Gallery.currentAlbum === dir) {
				var removed = false;
				// We try to see if an image was removed
				var movedImage = _(images).findIndex({path: filePath});
				if (movedImage >= 0) {
					images.splice(movedImage, 1);
					removed = true;
				} else {
					// It wasn't an image, so try to remove an album
					var movedAlbum = _(albums).findIndex({path: filePath});
					if (movedAlbum >= 0) {
						albums.splice(movedAlbum, 1);
						removed = true;
					}
				}

				if (removed) {
					$item.remove();
					// Refresh the photowall without checking if new files have arrived in the
					// current album
					// TODO On the next visit this album is going to be reloaded, unless we can get
					// an etag back from the move endpoint
					Gallery.view.init(Gallery.currentAlbum);
				}
			}
		}
	};
	window.Gallery = Gallery;
})(jQuery, OC, t);
