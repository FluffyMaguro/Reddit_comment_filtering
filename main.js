var app = {
keywords: [],
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
  app.key_dict = new Object();
  app.last_parent = null;
  instance.unmark();
  hide_comments();
  instance.mark(app.keywords, { //keywords
      "synonyms": {           // synonyms
          "WC3": "warcraft 3",
          "SC": "starcraft",
          "DOW": "dawn of war",
          "HW": "halo wars"
      },
       "separateWordSearch": false, // Search for whole things in mutli-word string
       "className": "highlighted",
       "filter": eachFilter,
       "each":eachFound,
       "ignorePunctuation": ":;.,-–—‒_(){}[]!?'\"+=".split(""),
        "accuracy": {
          "value": "exactly",
          "limiters": ":;.,-–—‒_(){}[]!?'\"+=".split(""),
    }
  });

  //Update keywords with numbers
  let keywords = document.getElementsByClassName("keyword_d");
    for (i = 0; i < keywords.length; i++) {
      let text = keywords[i].firstChild.textContent;
      let span = keywords[i].getElementsByTagName('span')[0];
      if (app.key_dict[text] != null) {
        span.innerHTML = app.key_dict[text]
      } else if (keywords[i].style.backgroundColor == keyword_deactivated_color) {
      } else {
        span.innerHTML = 0
      }
    }
}

// Save last found term. This function runs before 'each'
function eachFilter(node, term, count, countthis) {
  app.lastFoundTerm = term;
  return true
}

function eachFound(el) {
  let parent = el.parentElement; // Find parent comment block
  while (!(parent.classList.contains('rpost'))) {
      parent = parent.parentElement
  }

  if (app.last_parent == parent) {return} // Skip if it's the same parent
  app.last_parent = parent;
  parent.style.opacity = '1';

  if (app.key_dict[app.lastFoundTerm] == null) { //Update how many terms we found
      app.key_dict[app.lastFoundTerm] = 1
    } else {
      app.key_dict[app.lastFoundTerm] += 1
    }
}

function hide_comments(){ // Hides comments before filtering
  let comments = document.getElementsByClassName("rpost");
  for (i = 0; i < comments.length; i++) {
      if (app.keywords.length == 0) {
        comments[i].style.opacity = "1"
      } else {
        comments[i].style.opacity = ".3"
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

const keyword_activated_color = 'rgb(56, 214, 63)';
const keyword_deactivated_color = 'rgb(169, 169, 169)';

function addKeyword(){
  let text = keyInput.textContent;
  keyInput.innerHTML = '';
  if (text != null && text != '') {
    
    // Update visuals
    let node = document.createElement("DIV");
    node.classList.add("keyword_d");
    node.onclick = function() {keywordClicked(text, node)};
    node.style.backgroundColor = keyword_activated_color;

    let pnode = document.createElement("P");
    let textnode = document.createTextNode(text);
    pnode.appendChild(textnode);
    node.appendChild(pnode);

    let snode = document.createElement("SPAN");
    node.appendChild(snode);

    let bnode = document.createElement("BUTTON");
    bnode.innerHTML ='✕';
    bnode.onclick = function() {removeKeyword(text, node)};
    node.appendChild(bnode);
    document.getElementById("currentKeys").appendChild(node);

    // Add to app keywords & update
    app.keywords.push(text);
    highlight();
  }
}


function keywordClicked(key, node) {
  if (node.style.backgroundColor == keyword_deactivated_color) { //activate
    node.style.backgroundColor = keyword_activated_color;
    app.keywords.push(key);
  } else { // deactivate
    node.style.backgroundColor = keyword_deactivated_color;
    let index = app.keywords.indexOf(key);
    if (index > -1) {
      app.keywords.splice(index, 1);
    }
  }
  highlight();

}

function removeKeyword(key, node) {
  // remove from app keywords array
  const index = app.keywords.indexOf(key);
  if (index > -1) {
    app.keywords.splice(index, 1);
  }
  // Remove keyword element
  node.remove()

  // update comments
  highlight();
}

//DEBUGG!!!!
document.getElementById("newKey").innerHTML = 'heroes';
addKeyword();
document.getElementById("newKey").innerHTML = 'level';
addKeyword();

var synonyms = {
          "WC3": "warcraft 3",
          "SC": "starcraft",
          "DOW": "Warhammer 40,000: Dawn of War",
          "HW": "Halo Wars",
          "AoM": "Age of Mythology",
          "AotS": "Ashes of the Singularity",
          "C&C": "Command & Conquer",
          "CoH": "Company of Heroes",
          "BFME": "he Battle for Middle-earth",
          "AoE": "Age of Empires",
          "BW": "starcraft",
          "SupCom":"Supreme Commander",
          "UAW":"Universe at War",
          "w40k":"Warhammer 40,000: Dawn of War"
      };

var rts = [
'0 A.D',
 '7th Legion',
 '8-Bit Armies',
 '8-Bit Hordes',
 '8-Bit Invaders',
 'A Year of Rain',
 'ARSENAL Extended Power',
 'ARSENAL: Taste the Power',
 'Achron',
 'Act of Aggression',
 'Act of War: Direct Action',
 'Act of War: High Treason',
 'Against Rome',
 'Age of Empires',
 'Age of Mythology',
 'Aggression: Reign Over Europe',
 'Alexander',
 'Alien Legacy',
 'Alien Nations',
 'Allegiance',
 'America',
 'American Conquest',
 'Ancestors Legacy',
 'Ancient Art of War in the Skies, The',
 'Ancient Space',
 'Ancient Wars: Sparta',
 'Anno',
 'Arena Wars',
 'Armies of Exigo',
 'Army Men: RTS',
 'Ashes of the Singularity',
 'Atrox',
 'Axis and Allies',
 'BANNERMEN',
 'Baldies',
 'Battle Command',
 'Battle Isle: The Andosia War',
 'Battle Realms',
 'BattleForge',
 'Battlefleet Gothic: Armada',
 'Battles of the Outer Rim',
 'Battlezone',
 'Beasts and Bumpkins',
 'Black Moon Chronicles',
 'Blitzkrieg 3',
 'Blood & Magic',
 'Bokosuka Wars',
 'Bos Wars',
 'Cannon Fodder',
 'Carrier Command',
 'Castle Strike',
 'Celtic Kings: Rage of War',
 'Clash Royale',
 'Colobot',
 'Combat Leader',
 'Command & Conquer',
 'Command HQ',
 'Command: Chains of War',
 'Command: Modern Air Naval Operations',
 'Company of Heroes',
 'Conflict Zone',
 'Confrontation: Peace Enforcement',
 'Conquest Earth',
 'Conquest: Frontier Wars',
 'Cosmic Conquest',
 'Cossacks',
 'Counter Blow[6]',
 'Creeper World',
 'Crusader Kings',
 'Cultures 2: The Gates of Asgard',
 'Cultures: Discovery of Vinland',
 'Cytron Masters',
 'D-Day',
 'DEFCON: Everybody Dies',
 'Dark Colony',
 'Dark Planet: Battle for Natrolis',
 'Dark Reign',
 'Darwinia',
 'Dawn of Fantasy',
 'Desert Rats vs Afrika Korps',
 'Dogs of War: Battle On Primus IV',
 'Dominant Species',
 'Dominion: Storm Over Gift 3',
 'Dragon Force',
 'Dragon Throne: Battle of Red Cliffs',
 'Dune 2000',
 'Dune II',
 'Dungeons & Dragons: Dragonshard',
 'Earth 2140',
 'Earth 2150',
 'Earth 2160',
 'Emperor: Battle for Dune',
 'Empire Earth',
 'Empires Apart',
 'Empires: Dawn of the Modern World',
 'Enemy Nations',
 'Energy Warrior',
 'Etherium',
 'Europa Universalis',
 'Evil Genius',
 'Evolution RTS',
 'Executive Assault',
 'Eximius: Seize the Frontline',
 'Exodus: The Last War',
 'Extreme Tactics',
 'Faces of War',
 'Fate of Hellas',
 'Final Conflict',
 'Forged Battalion',
 'Foundation',
 'Fragile Allegiance',
 'Gain Ground',
 'Gangland',
 'Genesis Rising: The Universal Crusade',
 'Genewars',
 'Genius: Biology',
 'Giants: Citizen Kabuto',
 'Glest',
 'Globulation 2',
 'Great Invasions',
 'Grey Goo',
 'GrimGrimoire',
 'Ground Control',
 'HYPERNOVA: Escape from Hadea',
 'Haegemonia: Legions of Iron',
 'Halo Wars',
 'Hanjuku Eiyuu - Aa Sekai Yo Hanjuku Nare',
 'Hearts of Iron',
 'Hegemony Gold: Wars of Ancient Greece',
 'Hegemony III: Clash of the Ancients',
 'Hegemony Rome: The Rise of Caesar',
 'Heroes of Annihilated Empires',
 'Heroes of Mana',
 'Herzog',
 'Herzog Zwei',
 'Highland Warriors',
 'Homeworld',
 'Hostile Waters: Antaeus Rising',
 'Hundred Swords',
 'I of the Dragon',
 'Illyriad',
 'Imperator: Rome',
 'Imperium Galactica',
 'Imperivm: Great Battles of Rome',
 'Impossible Creatures',
 'Inkawar',
 'Invasion',
 'Iron Harvest',
 'Iron Seed',
 "J.R.R. Tolkien's Riders of Rohan",
 "J.R.R. Tolkien's War in Middle-earth",
 "Jeff Wayne's The War of the Worlds",
 'Judgment: Apocalypse Survival Simulation',
 'Jurassic War',
 'K240',
 'KKND',
 'Kingdom Under Fire: A War of Heroes',
 'Kingdom Wars 2: Battles',
 'KnightShift',
 'Knights and Merchants:',
 'Knights of Honor',
 'Kohan',
 'Konung 2: Blood of Titans',
 'L.E.D. Wars, The',
 'LEGO Rock Raiders',
 'Legionnaire',
 'Lord of the Rings',
 'The Battle for Middle-earth',
 'Lords of Everquest',
 'Loria',
 'LostMagic',
 'MAD: Global Thermonuclear War',
 'Machines',
 'Maelstrom',
 'Magic and Mayhem',
 'Magic and Mayhem: The Art of Magic',
 'Magnant',
 'Majesty 2: The Fantasy Kingdom Sim',
 'Majesty: The Fantasy Kingdom Sim',
 'Majesty: The Northern Expansion',
 'Malvinas 2032',
 'Mayday: Conflict Earth',
 'Mech Platoon',
 'Medieval II: Total War',
 'Medieval: Total War',
 'Mega Lo Mania',
 'MegaGlest',
 'Men of War',
 'Meridian: New World',
 'Meridian: Squad 22',
 'Metal Fatigue',
 'Metal Marines',
 'Micro Commandos',
 'Mission: Humanity',
 'Modem Wars',
 'Myth II: Soulblighter',
 'Myth III: The Wolf Age',
 'Myth: The Fallen Lords',
 'NATO Commander',
 'Napoleon',
 'Naval War: Arctic Circle',
 'Nemesis of the Roman Empire',
 'NetStorm: Islands At War',
 'Nether Earth',
 'Nexus: The Jupiter Incident',
 'Nightside',
 "No Man's Land",
 'North & South',
 'Northgard',
 'Ocean Battle',
 'Offworld Trading Company',
 'Original War',
 'Outlive',
 'Outpost 2: Divided Destiny',
 'ParaWorld',
 'Pax Imperia Eminent Domain',
 'Perimeter',
 'Persian Wars',
 'Pikmin',
 'Planet X2',
 'Planetary Annihilation',
 'Populous',
 'Powermonger',
 'Praetorians',
 'Psi-5 Trading Company',
 'R.U.S.E',
 'Rage of Mages',
 'Re-Legion',
 'Real War',
 'Red Odyssey, The',
 'Reunion',
 'Rise and Fall: Civilizations at War',
 'Rise of Nations',
 'Rising Kingdoms',
 'Rising Lands',
 'Rival Realms',
 'Riverworld',
 'Rome: Total War',
 'Rusted Warfare - RTS',
 'S.W.I.N.E.',
 'Sacrifice',
 'Sangokushi Battlefield',
 'Savage: The Battle for Newerth',
 'Sea Battle',
 'Sengoku',
 'Settlers',
 'Seven Kingdoms',
 'Shadow Sorcerer',
 'Shogun: Total War',
 'Siege',
 'Sins of a Solar Empire',
 'Skull Caps',
 'Smiley Commandos',
 'Soldiers: Heroes of World War II',
 'Space Colony',
 'SpellForce',
 'Spring 1944',
 'Spring project',
 'Stalin vs. Martians',
 'Star Command',
 'Star Trek',
 'Star Wars',
 'Brood War',
 'StarCraft',
 'Starship Troopers',
 'State of War',
 'Steel Division 2',
 'Steel Division: Normandy 44',
 'Stellar Warfare',
 'Stonkers',
 'Stronghold',
 'Submarine Titans',
 'Sudden Strike',
 'SunAge',
 'Supremacy 1914',
 'Supremacy: Your Will Be Done',
 'Supreme Commander',
 'Supreme Ruler 2010',
 'Supreme Ruler 2020',
 'Svea Rike',
 'Svea Rike 2',
 'Swords & Soldiers',
 'Tanktics',
 'Taste of Power',
 'Thandor: The Invasion',
 'The Ancient Art of War',
 'The Golden Horde',
 'The Nations',
 'Theatre of War',
 'Theocracy',
 'They Are Billions',
 'Three Kingdoms',
 'Tone Rebellion, The',
 'Tooth and Tail',
 'Total Annihilation',
 'Total War',
 'Two Thrones',
 'Tzar: Burden of the Crown',
 'Universe at War',
 'Urban Assault',
 'Utopia',
 'Victoria: An Empire Under the Sun',
 'War Front: Turning Point',
 'War Incorporated',
 'War Party',
 'War Wind',
 'War of Legends',
 'War of Nerves!',
 'WarBreeds',
 'Warcraft',
 'Wargame',
 'Warhammer 40,000: Dawn of War',
 'Dawn of War',
 'Warpath',
 'Warrior Kings',
 'Wars and Warriors',
 'Warzone 2100',
 'World War III',
 'World in Conflict',
 'WorldShift',
 'Z: Steel Soldiers',
 'Zero-K',
 'reconquest']