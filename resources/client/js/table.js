const DEFAULT_CHAT_WIDTH = 300

class PlayerPanel_ extends SmartDomElement{
    constructor(props){
        super("div", props)

        this.parentTable = this.props.parentTable

        this.player = this.props.player || Player()

        this.setPlayer(this.player)
    }

    sit(){
        api("play:sitPlayer", {            
            index: this.player.index
        }, response => {
            //console.log(response)
        })
    }

    unseat(){
        api("play:unseatPlayer", {            
            index: this.player.index
        }, response => {
            //console.log(response)
        })
    }

    resign(){
        api("play:resignPlayer", {            
            index: this.player.index
        }, response => {
            //console.log(response)
        })
    }

    build(){
        this.x().h(20)

        if(this.parentTable.g.inProgress){
            this.a(
                div().dfc().a(
                    UserLabel(this.player),
                    IS_ME(this.player) ? Button("Resign", this.resign.bind(this)) : div()
                )                
            )
        }else if(this.player.seated){
            this.a(
                div().dfc().a(
                    UserLabel(this.player),
                    Button("Unseat", this.unseat.bind(this))
                )                
            )
        }else{
            this.a(
                Button("Sit", this.sit.bind(this))
            )
        }
    }

    setPlayer(player){
        this.player = player

        this.build()
    }
}
function PlayerPanel(props){return new PlayerPanel_(props)}

class Table_ extends SmartDomElement{
    constructor(props){
        super("div", props)

        this.settings = {}
    }

    get g(){return this.board.game}
    get players(){return this.g.players}

    calcProps(){
        this.chatWidth = this.props.chatWidth || DEFAULT_CHAT_WIDTH
        this.chatHeight = this.board.boardsize() - 29
    }

    chatMessageEntered(msg){
        api("play:postChatMessage", {
            chatMessage: ChatMessage({
                author: USER_BLOB(),
                msg: msg
            })
        }, response => {
            //console.log(response)
        })
    }

    cancelEditTimecotrol(){        
        this.timecontrolFormHook.x()
        this.editTimeControlOn = false
    }

    editTimeControl(){
        this.timecontrolFormHook.x()
        this.editTimeControlOn = !this.editTimeControlOn
        if(this.editTimeControlOn) this.timecontrolFormHook.am(
            div().dfcc().bdr("solid", 5, "#aaa").mar(5).tac().pad(5).bc("#aff").a(
                FormTable({
                    options: [
                        Combo({                    
                            id: "variantCombo",                    
                            display: "Variant",                                        
                            options: SUPPORTED_VARIANTS.map(entry => ({value: entry[0], display: entry[1]})),
                            selected: this.g.variant,
                            settings: this.settings
                        }),
                        Combo({                    
                            id: "initialClockCombo",                    
                            display: "Initial Clock",                                        
                            options: Array(30).fill(0).map((_, i) => ({value: i, display: i})),
                            selected: 3,
                            settings: this.settings
                        }),
                        Combo({                    
                            id: "incrementCombo",                    
                            display: "Increment",                                        
                            options: Array(30).fill(0).map((_, i) => ({value: i, display: i})),
                            selected: 2,
                            settings: this.settings
                        })
                    ]
                })
                    .marl(10),
                div().a(
                    Button("Set", this.setTimecotrol.bind(this)).bc(GREEN_BUTTON_COLOR).mart(5),
                    Button("Set and Store", this.setAndStoreTimecontrol.bind(this)).bc(GREEN_BUTTON_COLOR).mart(5),                    
                    Button("Cancel", this.cancelEditTimecotrol.bind(this)).bc(YELLOW_BUTTON_COLOR).mart(5),
                ),
                div().a(
                    div().mart(5).ffm().fs(12).html("Presets:"),
                    this.presets = EditableList({
                        id: "presets",
                        disableEditOption: true,
                        customAddButton:{
                            caption: "Set",
                            callback: this.setTimecontrolFromPreset.bind(this),
                            backgroundColor: GREEN_BUTTON_COLOR
                        },
                        optionLabelWidthScale: -0.21
                    }).mart(5)
                )
            )
        )
    }

    requestSetTimecontrol(blob){
        api("play:setTimecontrol", {            
            variant: blob.variant,
            timecontrol: blob.timecontrol
        }, response => {
            //console.log(response)
        })
    }

    setTimecontrolFromPreset(){
        let preset = this.presets.state.selected.value
        let parts = preset.split("|")
        this.requestSetTimecontrol({
            variant: parts[0],
            timecontrol: {
                initial: parseInt(parts[1]),
                increment: parseInt(parts[2])
            }
        })
    }

    calcTimecontrolBlob(){
        return {
            variant: this.settings.variantCombo.selected,
            timecontrol:{
                initial: parseInt(this.settings.initialClockCombo.selected),
                increment: parseInt(this.settings.incrementCombo.selected)
            }            
        }
    }

    setTimecotrol(){
        this.requestSetTimecontrol(this.calcTimecontrolBlob())
    }

    setAndStoreTimecontrol(){
        let blob = this.calcTimecontrolBlob()

        this.presets.addOption(
            `${blob.variant}|${blob.timecontrol.initial}|${blob.timecontrol.increment}`,
            `${displayNameForVariant(blob.variant)} ${blob.timecontrol.initial} + ${blob.timecontrol.increment}`
        )

        this.requestSetTimecontrol(blob)
    }

    build(){
        this.chatText.setValue(this.g.chat.asText())                                        
        this.players.forEach(player => this.playerPanels[this.g.flip ? 1 - player.index : player.index].setPlayer(player))
        this.timecontrolDiv.x().a(
            VariantLabel(this.g),
            TimecontrolLabel(this.g).marl(5),
            Button("Edit", this.editTimeControl.bind(this)).marl(5)
        )
    }

    buildFromGame(game){
        this.board.op(1)
        game.flip = IS_ME(game.players.getByColor(BLACK))
        this.board.setgame(game)        
        this.build()
    }

    processApi(topic, payload){
        switch(topic){
            case "updategame":                
                let game = Game(payload.game)
                this.buildFromGame(game)
                break
        }
    }

    moveMade(san){        
        this.board.op(0.8)
        api("play:makeMove", {            
            san: san
        }, response => {
            //console.log(response)
        })
    }

    init(){        
        this.parentApp = this.props.parentApp

        this.board = Board({...this.props, ...{
            id: "board",
            parentApp: this,
            makeMoveCallback: this.moveMade.bind(this)
        }})

        this.calcProps()

        this.boardContainer = div().dfcc().a(
            this.board
        )

        this.chatContainer = div().por().a(
            this.timecontrolFormHook = div().poa().zi(100),
            div().dfcc().a(            
                this.chatText = TextAreaInput().w(this.chatWidth).h(this.chatHeight),
                this.chatInput = TextInput({
                    enterCallback: this.chatMessageEntered.bind(this)
                })
                    .w(this.chatWidth).mart(2),            
            )            
        )

        this.playerPanels = [0,1].map(i => PlayerPanel({
            parentTable: this,
            player: Player().setIndex(i)
        }))

        this.mainContainer = table().a(
            tr().a(
                td().a(this.playerPanels[0]),
                td().a(this.timecontrolDiv = div())
            ),
            tr().a(
                td().a(this.boardContainer),
                td().a(this.chatContainer),
            ),
            tr().a(
                td().a(this.playerPanels[1]),
                td()
            ),
        )

        this.mainContainer.bimg("url(resources/client/img/backgrounds/wood.jpg)")

        this.mar(3)

        this.ame(this.mainContainer)
    }
}
function Table(props){return new Table_(props)}