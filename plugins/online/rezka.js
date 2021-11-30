function create(component){
    let network    = new Lampa.Reguest()
    let token      = '2d55adfd-019d-4567-bbf7-67d503f61b5a'
    let object     = {}
    let extract    = {}

    let select_title = ''
    let select_id    = ''
    let filter_items = {}

    let choice = {
        season: 0,
        voice: 0
    }

    /**
     * Поиск
     * @param {Object} _object 
     */
    this.search = function(_object){
        object = _object

        select_title = object.movie.title

        let url = 'https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(object.search) + '&page=1'
        
        network.clear()

        network.silent(url,(json)=>{
            if(json.films && json.films.length){
                if(json.films.length == 1){
                    select_id = json.films[0].filmId

                    getFilm(json.films[0].filmId)
                }
                else{
                    similars(json.films)
                }

                component.loading(false)
            }
            else component.empty('По запросу ('+object.search+') нет результатов')
        },(a, c)=>{
            component.empty(network.errorDecode(a,c))
        },false,{
            headers: {
                'X-API-KEY': token
            }
        })
    }

    /**
     * Сброс фильтра
     */
     this.reset = function(){
        component.reset()

        choice = {
            season: 0,
            voice: 0
        }

        component.loading(true)

        getFilm(select_id)
    }

    /**
     * Применить фильтр
     * @param {*} type 
     * @param {*} a 
     * @param {*} b 
     */
     this.filter = function(type, a, b){
        choice[a.stype] = b.index

        component.reset()

        filter()

        component.loading(true)

        getFilm(select_id, extract.voice[choice.voice].token)

        setTimeout(component.closeFilter,10)
    }

    /**
     * Уничтожить
     */
    this.destroy = function(){
        network.clear()

        extract = null
    }

    /**
     * Показать похожие
     * @param {Array} films 
     */
    function similars(films){
        films.forEach(elem=>{
            let title = []

            if(elem.nameRu) title.push(elem.nameRu)
            if(elem.nameEn) title.push(elem.nameEn)

            elem.title   = title.join(' / ')
            elem.quality = (elem.year ? (elem.year + '').slice(0,4) : '----')
            elem.info    = ' / ' + (elem.type == 'TV_SERIES' ? 'Сериал' : 'Фильм')

            let item = Lampa.Template.get('online_folder',elem)

            item.on('hover:enter',()=>{
                component.loading(true)

                select_title = elem.title
                select_id    = elem.filmId

                getFilm(elem.filmId)
            })

            component.append(item)
        })
    }

    /**
     * Запросить фильм
     * @param {Int} id 
     * @param {String} voice 
     */
    function getFilm(id, voice){
        network.clear()

        network.timeout(10000)

        let url = 'https://voidboost.net/'

        if(voice){
            if(extract.season.length){
                url += 'serial/'+voice+'/iframe?s='+extract.season[choice.season].id+'&h=gidonline.io'
            }
            else{
                url += 'movie/'+voice+'/iframe?h=gidonline.io'
            }
        }
        else url += 'embed/'+id

        network.native(url,(str)=>{
            component.loading(false)

            extractData(str)

            filter()

            append()
        },()=>{
            component.empty()
        },false,{
            dataType: 'text'
        })
    }

    /**
     * Построить фильтр
     */
     function filter(){
        filter_items  = {
            season: extract.season.map(v=>v.name),
            voice: extract.season.length ? extract.voice.map(v=>v.name) : []
        }
        
        component.filter(filter_items, choice)
    }

    /**
     * Получить поток
     * @param {*} element 
     */
    function getStream(element, call, error){
        if(element.stream) return call(element.stream)

        let url = 'https://voidboost.net/'

        if(element.season){
            url += 'serial/'+extract.voice[choice.voice].token+'/iframe?s='+element.season+'&e='+element.episode+'&h=gidonline.io'
        }
        else{
            url += 'movie/'+element.voice.token+'/iframe?h=gidonline.io'
        }

        network.clear()

        network.timeout(3000)

        network.native(url,(str)=>{
            var videos = str.match("file': '(.*?)'")

            if(videos){
                let link = videos[0].match("1080p](.*?)mp4")

                if(!link) link = videos[0].match("720p](.*?)mp4")

                if(link){
                    element.stream = link[1]+'mp4'

                    call(link[1]+'mp4')
                }
                else error()
            }
            else error()

        },error,false,{
            dataType: 'text'
        })
    }

    /**
     * Получить данные о фильме
     * @param {String} str 
     */
    function extractData(str){
        extract.voice   = []
        extract.season  = []
        extract.episode = []

        str = str.replace(/\n/g,'')

        let voices = str.match('<select name="translator"[^>]+>(.*?)</select>')
        let sesons = str.match('<select name="season"[^>]+>(.*?)</select>')
        let episod = str.match('<select name="episode"[^>]+>(.*?)</select>')

        if(voices){
            let select = $('<select>'+voices[1]+'</select>')

            $('option',select).each(function(){
                let token = $(this).attr('data-token')

                if(token){
                    extract.voice.push({
                        token: token,
                        name: $(this).text()
                    })
                }
            })
        }

        if(sesons){
            let select = $('<select>'+sesons[1]+'</select>')

            $('option',select).each(function(){
                extract.season.push({
                    id: $(this).attr('value'),
                    name: $(this).text()
                })
            })
        }

        if(episod){
            let select = $('<select>'+episod[1]+'</select>')

            $('option',select).each(function(){
                extract.episode.push({
                    id: $(this).attr('value'),
                    name: $(this).text()
                })
            })
        }
    }

    /**
     * Показать файлы
     */
    function append(){
        component.reset()

        let items = []

        if(extract.season.length){
            extract.episode.forEach(episode=>{
                items.push({
                    title: 'S' + (choice.season + 1) + ' / ' + episode.name,
                    quality: '720p ~ 1080p',
                    season: choice.season + 1,
                    episode: parseInt(episode.id),
                    info: ' / ' + extract.voice[choice.voice].name
                })
            })
        }
        else{
            extract.voice.forEach(voice => {
                items.push({
                    title: select_title,
                    quality: '720p ~ 1080p',
                    voice: voice,
                    info: ' / ' + voice.name
                })
            })
        }

        items.forEach(element => {
            let hash = Lampa.Utils.hash(element.season ? [element.season,element.episode,object.movie.original_title].join('') : object.movie.original_title)
            let view = Lampa.Timeline.view(hash)
            let item = Lampa.Template.get('online',element)

            element.timeline = view

            item.append(Lampa.Timeline.render(view))

            item.on('hover:enter',()=>{
                if(object.movie.id) Lampa.Favorite.add('history', object.movie, 100)

                getStream(element,(stream)=>{
                    let first = {
                        url: stream,
                        timeline: view,
                        title: element.title
                    }

                    Lampa.Player.play(first)

                    Lampa.Player.playlist([first])
                },()=>{
                    Lampa.Noty.show('Не удалось извлечь ссылку')
                })
            })

            component.append(item)
        })

        component.start(true)
    }
}

export default create