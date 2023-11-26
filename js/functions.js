$(document).ready(function(){
    
    var redirect_uri = "http://127.0.0.1:5500/index.html";
    var client_id = "438b8080b942439495c0c5553d00c383";
    var client_secret = "98642f7a70a04aa7908bff888c4a6145";

    let code = getCode();
    if (code == null) {
        requestAuthorization(redirect_uri, client_id, client_secret);
    } else {
        fetchAccessToken(code, redirect_uri, client_id, client_secret);
        window.history.pushState("", "", redirect_uri);
        refreshDevices();
        refreshPlaylists();
    }

});

/** Solicita autorización a Spotify */
function requestAuthorization(redirect_uri, client_id, client_secret) {
    localStorage.setItem("client_id", client_id);
    localStorage.setItem("client_secret", client_secret);

    let url = "https://accounts.spotify.com/authorize?client_id=" + client_id + "&response_type=code" 
        + "&redirect_uri=" + encodeURI(redirect_uri) + "&show_dialog=true" 
        + "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private";;
    window.location.href = url;
}

/** Obtiene el código que devuelve Spotify tras la autorización */
function getCode() {
    let code = null;
    const url = window.location.search;
    if (url.length > 0) {
        const urlParams =new URLSearchParams(url);
        code = urlParams.get("code");
    }

    return code;
}

/** Solicita acceso a la API de Spotify */
function fetchAccessToken(code, redirect_uri, client_id, client_secret) {
    let body = "grant_type=authorization_code" + "&code=" + code + "&redirect_uri=" + encodeURI(redirect_uri) 
        + "&client_id=" + client_id  + "&client_secret=" + client_secret;
    callAuthorizationApi(body, client_id, client_secret);
}

function callAuthorizationApi(body, client_id, client_secret) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "https://accounts.spotify.com/api/token", true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ":" + client_secret));
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse;
}

/** Maneja la respuesta tras la petición de acceso a la API */
function handleAuthorizationResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        console.log(data);
        if (data.access_token != undefined) {
            localStorage.setItem("access_token", data.access_token);
        }
        if(data.refresh_token != undefined) {
            localStorage.setItem("refresh_token", data.refresh_token);
        }
    } else {
        alert(this.responseText);
    }
}

//De moennto no lo estoy usando
function refreshDevices(){
    callApi( "GET", "https://api.spotify.com/v1/me/player/devices", null, handleDevicesResponse );
}

//De momento no lo estoy usando
function handleDevicesResponse(){
    if ( this.status == 200 ){
        var data = JSON.parse(this.responseText);
        console.log("devices", data);
        //removeAllItems( "devices" );
        //data.devices.forEach(item => addDevice(item));
    }
    else if ( this.status == 401 ){
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

function callApi(method, url, body, callback){
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem("access_token"));
    xhr.send(body);
    xhr.onload = callback;
}

/** Obtener las 10 últimas playlist */
function refreshPlaylists(){
    callApi( "GET", "https://api.spotify.com/v1/me/playlists?limit=10", null, handlePlaylistsResponse);
}

function handlePlaylistsResponse(){
    if ( this.status == 200 ){
        var data = JSON.parse(this.responseText);
        console.log(data);
        removeAllItems( "playlists");
        data.items.forEach(item => addPlaylist(item));
    } else if ( this.status == 401 ){
        refreshAccessToken();
    } else {
        alert(this.responseText);
    }
}

function addPlaylist(item){
    let node = document.createElement("option");
    node.value = item.id;
    node.innerHTML = item.name + " (" + item.tracks.total + ")";
    document.getElementById("playlists").appendChild(node); 
}

/** Obtener los tracks de la playlist seleccionada */
function fetchTracks(){
    let playlist_id = document.getElementById("playlists").value;
    if ( playlist_id.length > 0 ){
        url = "https://api.spotify.com/v1/playlists/{{PlaylistId}}/tracks?limit=15".replace("{{PlaylistId}}", playlist_id);
        callApi( "GET", url, null, handleTracksResponse );
    }
}

function handleTracksResponse(){
    if ( this.status == 200 ){
        var data = JSON.parse(this.responseText);
        console.log(data);
        removeAllItems( "tracks" );
        data.items.forEach( (item, index) => addTrack(item, index));
    }
    else if ( this.status == 401 ){
        refreshAccessToken();
    } else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

function addTrack(item, index){
    let node = document.createElement("li");
    node.value = index;
    node.innerHTML = item.track.name + " - " + item.track.artists[0].name;
    document.getElementById("tracks").appendChild(node); 
}

function play(){
    let playlist_id = document.getElementById("playlists").value;
    let trackindex = document.getElementById("tracks").firstChild.value;
    //let album = document.getElementById("album").value;
    let body = {};
    //if ( album.length > 0 ){
    //    body.context_uri = album;
   // } else{
        body.context_uri = "spotify:playlist:" + playlist_id;
    //}
    body.offset = {};
    body.offset.position = trackindex.length > 0 ? Number(trackindex) : 0;
    body.offset.position_ms = 0;
    //device_id hay que obtener el que quieras usar
    callApi( "PUT", "https://api.spotify.com/v1/me/player/play" + "?device_id=7bd05c52394479190dd23477f8492004377a9e00", JSON.stringify(body), handleApiResponse );
}

function pause() {
    callApi( "PUT", "https://api.spotify.com/v1/me/player/pause" + "?device_id=" + "7bd05c52394479190dd23477f8492004377a9e00", null, handleApiResponse );
}

function next() {
    callApi( "POST", "https://api.spotify.com/v1/me/player/next" + "?device_id=" + "7bd05c52394479190dd23477f8492004377a9e00", null, handleApiResponse );
}

function previous() {
    callApi( "POST", "https://api.spotify.com/v1/me/player/previous" + "?device_id=" + "7bd05c52394479190dd23477f8492004377a9e00", null, handleApiResponse );
}

function handleApiResponse(){
    if ( this.status == 200){
        console.log(this.responseText);
        //setTimeout(currentlyPlaying, 2000);
    }
    else if ( this.status == 204 ){
        //setTimeout(currentlyPlaying, 2000);
    }
    else if ( this.status == 401 ){
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
    }    
}

function refreshAccessToken(){
    refresh_token = localStorage.getItem("refresh_token");
    let body = "grant_type=refresh_token";
    body += "&refresh_token=" + refresh_token;
    body += "&client_id=" + client_id;
    callAuthorizationApi(body);
}

function removeAllItems(elementId){
    let node = document.getElementById(elementId);
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

