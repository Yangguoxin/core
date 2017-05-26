<?php
/**
 * ownCloud - gallery
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Olivier Paroz <owncloud@interfasys.ch>
 *
 * @copyright Olivier Paroz 2014-2016
 */

namespace OCA\Gallery\AppInfo;

/**
 * Application routes
 *
 * The name is the lowercase name of the controller without the controller
 * part, the stuff after the hash is the method.
 *
 * e.g. page#index -> PageController->index()
 */
return [
	'routes' => [
		/**
		 * Main routes
		 */
		[
			'name' => 'page#index',
			'url'  => '/',
			'verb' => 'GET'
		],
		// Landing page for public galleries. If a filename is given the file is downloaded
		[
			'name'     => 'page#public_index',
			'url'      => '/s/{token}/{filename}',
			'verb'     => 'GET',
			'defaults' => ['filename' => null]
		],
		// Landing page after password entry, for public galleries
		[
			'name'    => 'page#public_index',
			'url'     => '/s/{token}',
			'verb'    => 'POST',
			'postfix' => 'post'
		],
		// An error page which can handle different error codes
		[
			'name' => 'page#error_page',
			'url'  => '/error',
			'verb' => 'GET'
		],
		// The same page, but for POST
		[
			'name'    => 'page#error_page',
			'url'     => '/error',
			'verb'    => 'POST',
			'postfix' => 'post'
		],
		[
			'name' => 'page#slideshow',
			'url'  => '/slideshow',
			'verb' => 'GET'
		],
		/**
		 * Services
		 */
		// Gallery config, as well as supported media types
		[
			'name' => 'config#get',
			'url'  => '/config',
			'verb' => 'GET'
		],
		// The list of images of which previews can be generated
		[
			'name' => 'files#get_list',
			'url'  => '/files/list',
			'verb' => 'GET'
		],
        // The list of thumbnails of persons' face which previews can be generated
        [
            'name' => 'files#face_suggest',
            'url'  => '/files/suggest/{key}',
            'verb' => 'GET'            
        ],
        // The list of one person's image which previews can be generated        
        [
            'name' => 'files#person_list',
            'url'  => '/files/person',
            'verb' => 'GET'            
        ],
        // get face thumbnails
        [
            'name' => 'preview#get_face_thumbnails',
            'url'  => '/faceThumbnails',
            'verb' => 'GET'
        ],  
        // Set person's name
        [
            'name' => 'files#set_name',
            'url'  => '/files/setName/{oldName}/{newName}',
            'verb' => 'GET'            
        ],           
		// File download
		[
			'name'     => 'files#download',
			'url'      => '/files/download/{fileId}',
			'verb'     => 'GET',
			'defaults' => ['fileId' => null]
		],
		// Batch creation of thumbnails
		[
			'name' => 'preview#get_thumbnails',
			'url'  => '/thumbnails',
			'verb' => 'GET'
		],
		// Large preview of a file
		[
			'name' => 'preview#get_preview',
			'url'  => '/preview/{fileId}',
			'verb' => 'GET'
		],
		/**
		 * Public services
		 */
		[
			'name' => 'config_public#get',
			'url'  => '/config.public',
			'verb' => 'GET'
		],
		[
			'name' => 'files_public#get_list',
			'url'  => '/files.public/list',
			'verb' => 'GET'
		],
		[
			'name'     => 'files_public#download',
			'url'      => '/files.public/download/{fileId}',
			'verb'     => 'GET',
			'defaults' => ['fileId' => null]
		],
		[
			'name' => 'preview_public#get_thumbnails',
			'url'  => '/thumbnails.public',
			'verb' => 'GET'
		],
		[
			'name' => 'preview_public#get_preview',
			'url'  => '/preview.public/{fileId}',
			'verb' => 'GET'
		],
		/**
		 * API
		 */
		[
			'name'         => 'config_api#preflighted_cors', // Valid for all API end points
			'url'          => '/api/{path}',
			'verb'         => 'OPTIONS',
			'requirements' => ['path' => '.+']
		],
		[
			'name' => 'config_api#get',
			'url'  => '/api/config',
			'verb' => 'GET'
		],
		[
			'name' => 'files_api#get_list',
			'url'  => '/api/files/list',
			'verb' => 'GET'
		],
		[
			'name' => 'files_api#download',
			'url'  => '/api/files/download/{fileId}',
			'verb' => 'GET'
		],
		[
			'name' => 'preview_api#get_thumbnails',
			'url'  => '/api/thumbnails',
			'verb' => 'GET'
		],
		[
			'name' => 'preview_api#get_preview',
			'url'  => '/api/preview/{fileId}/{width}/{height}',
			'verb' => 'GET'
		],
		[
			// For embeddable galleries
			'name' => 'preview_api#show_gallery',
			'url'  => '/api/gallery/{folderId}',
			'verb' => 'GET'
		],
        // The list of thumbnails of persons' face
        [
            'name' => 'files_api#face_suggest',
            'url'  => '/api/files/suggest/{key}',
            'verb' => 'GET'            
        ],
        // The list of one person's image
        [
            'name' => 'files_api#person_list',
            'url'  => '/api/files/person/{name}',
            'verb' => 'GET'            
        ],   
        // Set person's name
        [
            'name' => 'files_api#set_name',
            'url'  => '/api/files/setName/{oldName}/{newName}',
            'verb' => 'GET'            
        ],
        // get face thumbnails
        [
            'name' => 'preview_api#get_face_thumbnails',
            'url'  => '/api/faceThumbnails/{files}',
            'verb' => 'GET'
        ],          
	]
];
