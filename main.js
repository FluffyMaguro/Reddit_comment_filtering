var app = {
keywords: [],
init: function() {
  document.querySelector('.reddit-dump').innerHTML = '';
  document.getElementById("status").innerHTML = '';
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
  url = document.getElementById("urllink").innerHTML
  if (url != '') {
     fetch(url+'.json?limit=20')
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
  highlight();
  show_hide()
},

getCommentsFromJSON: function(json) {
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


// Highlights text with given strings
function highlight() {
  console.log('HL:' + app.keywords)
  let instance = new Mark(document.querySelector(".reddit-dump"));
  instance.unmark();
  instance.mark(app.keywords, { //keywords
      "synonyms": {           // synonyms
          "WC3": "warcraft 3",
          "SC": "starcraft",
          "DOW": "dawn of war"
      },
       "separateWordSearch": false, //search for whole things in mutli-word string
       "className": "highlighted",
       "ignorePunctuation": ":;.,-–—‒_(){}[]!?'\"+=".split(""),
        "accuracy": {
          "value": "exactly",
          "limiters": ":;.,-–—‒_(){}[]!?'\"+=".split(""),
    }
  });
}

// Filters out comments without highlighted strings
function show_hide() {
  let comments = document.getElementsByClassName("rpost");

  for (i = 0; i < comments.length; i++) {
    // Check if it has highlighted childs
    let show = false;
    if (app.keywords.length == 0) {show = true} else {
      if (comments[i] != null) {
        for (j = 0; j < comments[i].childNodes.length; j++) {
          if ((comments[i].childNodes[j].classList != null) && (comments[i].childNodes[j].classList.contains('highlighted'))) {
            show = true
          }
        }
      }
    }
    // Mark
    if (show) {
      comments[i].style.opacity = "1";
    } else {
      comments[i].style.opacity = ".3";
    }
  }
}

// START

// Init comment search
app.init()
// Add focus to search?
// document.getElementById("urllink").focus()


// Bind enter for input to add new keyword
var keyInput = document.getElementById("newKey");
keyInput.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.getElementById("keyBtn").click();
    }
});

function addKeyword(){
  let text = keyInput.textContent;
  keyInput.innerHTML = '';
  if (text != null && text != '') {
    
    // Update visuals
    let node = document.createElement("DIV");
    node.classList.add("keyword_d");
    let pnode = document.createElement("P");
    let textnode = document.createTextNode(text);
    pnode.appendChild(textnode);
    node.appendChild(pnode);

    let bnode = document.createElement("BUTTON");
    bnode.innerHTML ='✕';
    bnode.onclick = function() {removeKeyword(text, node)};
    node.appendChild(bnode);
    document.getElementById("currentKeys").appendChild(node);

    // Add to app keywords & update
    app.keywords.push(text);
    highlight();
    show_hide()
  }
}

function removeKeyword(key, node) {
  console.log('removing key '+ key)

  // remove from app keywords array
  const index = app.keywords.indexOf(key);
  if (index > -1) {
    app.keywords.splice(index, 1);
  }
  // Remove keyword element
  node.remove()

  // update comments
  highlight();
  show_hide()
}

//DEBUGG!!!!
document.getElementById("newKey").innerHTML = 'heroes';
addKeyword();
document.getElementById("newKey").innerHTML = 'level';
addKeyword();