# SuperUpload

When a user picks a file from their computer, the upload automatically begins. 
While uploading, the percentage complete is visible on the page. 
It should update at least every 2 seconds.
While uploading, the user should be able to enter text into a description text area.
When the upload completes, the page should display the path to the saved file. 
When the user clicks save, the current value of the description text area should be posted to the server. 
The response to the form post request should display both the title and the path to the file.

## Concept

### Server
The server is based on http node.js library.
Multipart parsing is provided by node-formdidable and static content is provided by node-paperboy.
The server provides a simple view renderer, using html files and placeholders `%PLACEHOLDER%`.
When an upload form is requested, the server generates an UUID and passes it to a view.
When a file is uploaded, a progress event is triggered and the updated status is calculated and stored.


### Browser
The upload form contains an UUID that is different every request.
Upload is asynchronous thanks to the iframe target trick.
When the upload is submitted, XHR polls the server every 2 seconds to get the upload status and path.
When the upload is finished, the browser submits a form containing the description textarea or waits for
the user if the save button was not pressed.
Browser-side scripting is 100% pure JavaScript. 

## Usage

`node superupload.js`
