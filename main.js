var app = {
keywords: [],
shown_keywords: [],
lastFoundTerm: null,
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
  url = document.getElementById("urllink").innerHTML;
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
  if (document.getElementById("rts").checked) { 
    app.keywords = data_rts
  }
  highlight();
  disableAll()
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
      let permalink = item.data.permalink;
      permalink = 'https://www.reddit.com'+permalink;

      text += '<div class="rpost gen'+generation+'" style="margin-left:'+generation*40+'px"><a target="_blank" href="'+ permalink +'"><div class="rauthor">'+item.data.author + ' 🠉' + item.data.score + '</div></a>';                                  
      
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
  
  let instance = new Mark(document.querySelector(".reddit-dump"));
  app.key_dict = new Object();
  app.last_found = {parent: null, term: null, updated_term: null};
  instance.unmark();
  hide_comments();

  console.log('HL:', app.keywords);

  instance.mark(app.keywords, { //keywords
      "synonyms": data_synonyms,
       "separateWordSearch": false, // Search for whole things in mutli-word string
       "className": "highlighted",
       "filter": eachFilter,
       "each":eachFound,
       "wildcards": "enabled",
       "ignorePunctuation": ":;.,-–—‒_(){}[]/!?'\"+=".split(""),
        "accuracy": {
          "value": "exactly",
          "limiters": ":;.,-–—‒_(){}[]/!?'\"+=".split(""),
    }
  });

  //Add RTS keywords elements
  for (const [key, value] of Object.entries(app.key_dict)) {
      // console.log(key, value);
        index = app.shown_keywords.indexOf(key); // check if it's shown
        if (index < 0) {
          createKeywordElement(key);
        }
    }

  // Update search to those are were found (in RTS case)
  app.keywords = [];
  let keywords = document.getElementsByClassName("keyword_d");
    for (i = 0; i < keywords.length; i++) {
      if (keywords[i].style.backgroundColor == keyword_activated_color) {
          app.keywords.push(keywords[i].firstChild.textContent)
      }
    }

  //Update keywords with numbers
  console.log(app.key_dict)
  for (i = 0; i < keywords.length; i++) {
    let text = keywords[i].firstChild.textContent;
    let span = keywords[i].getElementsByTagName('span')[0];
    if (app.key_dict[text] != null) {
      span.innerHTML = app.key_dict[text]
    } else if (keywords[i].style.backgroundColor == keyword_deactivated_color) {
    } else if (span.innerHTML == null) {
      span.innerHTML = 0
    }
  }
}

// Save last found term
function eachFilter(node, term, count, countthis) {
  app.last_found.term = term;
  return true
}

function eachFound(el) {
  let parent = el.parentElement; // Find parent comment block
  while (!(parent.classList.contains('rpost'))) {
      parent = parent.parentElement
  }

  // Check if we found either new term, or the same one in another comment
  if ((app.last_found.parent != parent) || (app.last_found.updated_term != app.last_found.term)) {
    app.last_found.updated_term = app.last_found.term;
    if (app.key_dict[app.last_found.term] == null) {
      app.key_dict[app.last_found.term] = 1
    } else {
      app.key_dict[app.last_found.term] += 1
    }
  }

  // Update comment visibility
  if (app.last_found.parent != parent) {
    app.last_found.parent = parent;
    // parent.style.display = 'block';
    parent.style.opacity = "1";
  }
}

function newUrl() {
  let param = "url=" + document.getElementById("urllink").textContent;
  if (document.getElementById("rts").checked) {
    param = param + '&rts'
  }
  document.location.search = param;
}

function hide_comments(){ // Hides comments before filtering
  let comments = document.getElementsByClassName("rpost");
  for (i = 0; i < comments.length; i++) {
      if (app.keywords.length == 0) {
        // comments[i].style.display = "block";
        comments[i].style.opacity = "1"
      } else {
        // comments[i].style.display = "none";
        comments[i].style.opacity = ".5"
      }
    }
}


// INIT 

// 1. Parse url paramters
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
if (urlParams.has('url')) {
  document.getElementById("urllink").innerHTML = urlParams.get('url');
}


if (urlParams.has('rts')) {
  document.getElementById("rts").checked = true;
}

// 2. Init app
app.init()

// 3. Bind enter for input to add new keyword
var keyInput = document.getElementById("newKey");
keyInput.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.getElementById("keyBtn").click();
    }
});

const keyword_activated_color = 'rgb(40, 230, 50)';
const keyword_deactivated_color = 'rgb(169, 169, 169)';

// INIT END

function addKeyword(){
  let text = keyInput.textContent;
  keyInput.innerHTML = '';
  if (text != null && text != '') {
    createKeywordElement(text);

    // Add to app keywords & update
    app.keywords.push(text);
    highlight();
  }
}

function createKeywordElement(text) {
 if (text != null && text != '') {
    
    // Update visuals
    let node = document.createElement("DIV");
    node.classList.add("keyword_d");
    node.onclick = function() {keywordClicked(text, node)};
    node.style.backgroundColor = keyword_activated_color;
    node.title = "In how many comments the keyword was mentioned. Click to enable/disable filtering.";

    let pnode = document.createElement("P");
    let textnode = document.createTextNode(text);
    pnode.appendChild(textnode);
    node.appendChild(pnode);

    let snode = document.createElement("SPAN");
    let ptextnode = document.createTextNode(0);
    snode.appendChild(ptextnode);
    node.appendChild(snode);

    let bnode = document.createElement("BUTTON");
    bnode.innerHTML ='✕';
    bnode.onclick = function() {removeKeyword(text, node)};
    node.appendChild(bnode);
    document.getElementById("currentKeys").appendChild(node);
    app.shown_keywords.push(text);
  }
}

function keywordClicked(key, node) {
  if (node.style.backgroundColor == keyword_deactivated_color) { //activate
    node.style.backgroundColor = keyword_activated_color;
    node.style.borderColor = '#098100';
    app.keywords.push(key);
  } else { // deactivate
    node.style.backgroundColor = keyword_deactivated_color;
    node.style.borderColor = '#ccc';
    let index = app.keywords.indexOf(key);
    if (index > -1) {
      app.keywords.splice(index, 1);
    }
  }
  highlight();
}

function disableAll() { //disables all keyword buttons
  app.keywords = [];
  let keywords = document.getElementsByClassName("keyword_d");
  for (i = 0; i < keywords.length; i++) {
    keywords[i].style.backgroundColor = keyword_deactivated_color;
  }
  highlight();
}

function removeKeyword(key, node) {
  // remove from app keywords array
  let index = app.keywords.indexOf(key);
  if (index > -1) {
    app.keywords.splice(index, 1);
  }

  index = app.shown_keywords.indexOf(key);
  if (index > -1) {
    app.shown_keywords.splice(index, 1);
  }
  // Remove keyword element
  node.remove()

  // update comments
  highlight();
}

