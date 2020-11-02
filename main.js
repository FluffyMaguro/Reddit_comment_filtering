var app = {
init: function() {
  console.log('Running...');
  document.querySelector('.reddit-dump').innerHTML = ''
  document.getElementById("status").innerHTML = ''
  if (document.readyState != 'loading') {
    this.startApp();
  } else {
    document.addEventListener('DOMContentLoaded', this.startApp);
  }
},

//fetch helpers
status: function (response) {
  if (response.status >= 200 && response.status < 300) {
    return Promise.resolve(response)
  } else {
    document.getElementById("status").innerHTML = '<span style="color: red">'+response.statusText+'</span>';    
    return Promise.reject(new Error(response.statusText))
  }
},
json: function (response) {
  return response.json()
},

//Main
startApp: function() {
 //Get Feed
  console.log('Fetching feed...');
  url = document.getElementById("urllink").innerHTML
  if (url != '') {
     fetch(url+'.json?limit=100')
      .then(app.status)
      .then(app.json)
      .then(app.getCommentsFromJSON)
        .then(app.addCommentstoHTML)
      .catch(function(error) {
      console.log('request failed', error.message)
      document.getElementById("status").innerHTML = '<span style="color: red">Request failed!</span>'
      });
  }
},

//Drop the text into the HTML
addCommentstoHTML: function(text) {
  document.querySelector('.reddit-dump').innerHTML = text;
},

getCommentsFromJSON: function(json) {
  console.log('Finding comments...');
  var text = app.getCommentsFromArray(json[1].data.children,0);
  return text;
},

//Recursively go through the object tree and compile all the comments
getCommentsFromArray: function(arr, generation) {
  var text = '';
  
  arr.forEach(function(item) {
    if (typeof item !== 'undefined') {
      text += '<div class="rpost gen'+generation+'" style="margin-left:'+generation*40+'px"><div class="rauthor">'+item.data.author + ' 🠉' + item.data.score + '</div>';                                  
      
      
      let body = item.data.body;     
      if (body != null) {
        // replace spaces
        body = body.replaceAll('&amp;#x200B;','<br>');

        // replace bold
        let bold = /\*\*(.*?)\*\*/gm;
        body = body.replace(bold, '<strong>$1</strong>');       

        // replace links
        let elements = body.match(/\[.*?\)/g);
        if (elements != null && elements.length > 0){
          for (el of elements) {
              if (el != null) {
                let txt = el.match(/\[(.*?)\]/); //get only the txt
                let url = el.match(/\((.*?)\)/); //get only the link
                if (txt!=null && url!=null) {
                  body = body.replace(el,'<a href="'+url[1]+'" target="_blank">'+txt[1]+'</a>')
                }
              }
          }
        }
      }
      text += body + '</div>';

      // recursively go deeper
      if (typeof item.data.replies !== 'undefined' && item.data.replies !== '') {
        text += app.getCommentsFromArray(item.data.replies.data.children, generation+1);
      }
    }
  });
  return text;
}
};

app.init()