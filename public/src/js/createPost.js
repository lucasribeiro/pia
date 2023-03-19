
var API_URL = 'http://localhost:3000/posts';

// Declaração dos elementos para manipulação
var countLabel = document.getElementById('count-text');
var description = document.getElementById('post-description');
var displayPosts = document.getElementById('display-posts');
var submitButton = document.getElementById('submitButton');
var closeButton = document.getElementById('closeButton');
var errorToast = document.getElementById('errorToast');
var syncToast = document.getElementById('syncToast');
var installBtn = document.getElementById('installBtn');
var submitFindButton = document.getElementById('submitFindButton');
var textFind = document.getElementById('textFind');
var closeFindButton = document.getElementById('closeFindButton');

var online = true;

window.addEventListener('online',  isOnline);
window.addEventListener('offline', isOnline);

description.onkeyup = function () {
  countLabel.innerHTML = (129 - this.value.length).toString();
};

// Evento para disparar a instalação do app
installBtn.addEventListener('click', function (e) {
  e.preventDefault();

  if (appInstaller) {
    appInstaller.prompt();

    appInstaller.userChoice
      .then(function (choiceResult) {
        if (choiceResult.outcome === 'dismissed') {
          console.log('User cancelled installation');
        } else {
          console.log('User added to home screen');
        }
      });
    
    appInstaller = null;
  }
})

function createCard (description) {

  var numCards = displayPosts.childNodes.length;

  var column = document.createElement('div');
  column.classList.add('container');
  column.classList.add('text-center');

  var card = document.createElement('div');
  card.classList.add('row');
  card.classList.add('align-items-start');

  var colImage = document.createElement('div');
  colImage.classList.add('col-2');

  var colText = document.createElement('div');
  colText.classList.add('col-10');
  colText.classList.add('textPost');  
  colText.setAttribute("id", "texto-" + (numCards + 1).toString());
  

  var htmlDescription = document.createElement('p');
  htmlDescription.classList.add('card-text');
  htmlDescription.innerText = description;

  var foto = document.createElement('img')
  foto.src = 'src=/../src/images/foto.png';
  foto.classList.add('imagemPost');

  var htmlDescription = document.createElement('p');
  htmlDescription.classList.add('textPost'); 
  htmlDescription.innerText = description;

  // Adicionando como filhos
  column.appendChild(card);
  card.appendChild(colImage);
  card.appendChild(colText);
  colImage.appendChild(foto);
  colText.innerHTML = description;
  //colText.appendChild(htmlDescription);

  displayPosts.appendChild(column);
}

// Função para atualizar a página HTML
function updateUI(data) {
  // Remove todos os posts
  displayPosts.innerHTML = '';

  // Percorre o array e adiciona os posts
  for (item of data) {
    createCard(item.description);
  }
} 

var networkDataReceived = false;

if (online) {
  buscarPosts();
}
else{
  // Update da UI pelo indexedDB
  if ('indexedDB' in window) {
    readAllData('posts')
      .then(function (data) {
        if (!networkDataReceived) {
          console.log('FROM CACHE');
          updateUI(data);
        }
      })
      .catch(function (error) {
        console.log(error);
      })
  }
}

submitFindButton.addEventListener('click', function() {
  if (textFind.value !== '')
  {
    var numCards = displayPosts.childNodes.length;
    searchTerm = textFind.value; 

    for (let index = 0; index < numCards; index++) {
      
      var texto = document.getElementById('texto-' + (index + 1).toString());

      var html = texto.innerHTML;
      var html_limpo = tiraAcentos(html);

      var pattern = "([^\\w]*)(" + tiraAcentos(searchTerm)+"|"+searchTerm + ")([^\\w]*)";
      var rg = new RegExp(pattern, "g");
      var match = rg.exec(html_limpo);
      if(match) {
        var match_pos = html_limpo.indexOf(tiraAcentos(match[2]));
        match[2] = html.substring(match_pos, match[2].length+match_pos);
        rg = new RegExp(pattern.replace(tiraAcentos(searchTerm),match[2]), "g");
        html = html.replace(rg,match[1] + "<b class='find'>"+ match[2] +"</b>" + match[3]);
        texto.innerHTML = html;
      }      
    }  
  }
  textFind.value = '';
  closeFindButton.click();
});

function tiraAcentos(i){
   
  var i = i.toLowerCase().trim();

  var acentos = "ãáàâäéèêëíìîïõóòôöúùûüç";
  var sem_acentos = "aaaaaeeeeiiiiooooouuuuc";
  
  for(var x=0; x<i.length; x++){
     var str_pos = acentos.indexOf(i.substr(x,1));
     if(str_pos != -1){
        i = i.replace(acentos.charAt(str_pos),sem_acentos.charAt(str_pos));
     }
  }
  
  return i;
}

// Evento de Click do Modal
submitButton.addEventListener('click', function() {
  if (description.value === '') {
    const toastError = new bootstrap.Toast(errorToast);
    closeButton.click();
    return toastError.show();
  }

  closeButton.click();

  // Envia o post para fila do service worker
  if ('serviceWorker' in navigator && 'SyncManager' in window) {        
    if (!online){
      navigator.serviceWorker.ready
          .then(function(sw) {
            var post = {
              id: Math.random(),
              title: title.value,
              description: description.value
            }
            writeData('sync-posts', post)
              .then(function() {
                return sw.sync.register('sync-new-posts');
              })
              .then(function() {
                resetForm();

                // Retorna um alerta para o usuário
                const toastSync = new bootstrap.Toast(syncToast);
                return toastSync.show();
              })
              .catch(function(error) {
                console.log(error);
              })
          })
      }
      else {
        postData(description.value);
        resetForm();
      }
    }  
});

// Função para resetar o form
function resetForm () {
  description.value = '';
}

// Fetch para enviar posts para o servidor local
function postData (description) {
  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': "application/json"
    },
    body: JSON.stringify({
      id: Math.random(),
      description: description
    })
  })
  .then(function (res) {
    return res.json()
  })
  .then(function(res) {
    console.log('Sent data', res);
    buscarPosts();
  })
}

function buscarPosts()
{
  // Fetch inicial da aplicação
  fetch(API_URL)
  .then(function(res) {
    return res.json();
  })
  .then(function (data) {
    networkDataReceived = true;
    console.log('FROM API REST');
    updateUI(data);
  })
  .catch(function (error) {
    console.log(error);
  })
}

function isOnline(event) {
  online = navigator.onLine;
}
