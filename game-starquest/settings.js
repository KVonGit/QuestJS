"use strict"

settings.title = "Star Quest"
settings.author = "The Pixie"
settings.version = "0.1"
settings.thanks = []
settings.warnings = "No warnings have been set for this game."
settings.playMode = "dev"

settings.compassPane = false
settings.panesCollapseAt = 0
settings.themes = ['sans-serif']
settings.styleFile = 'style'
settings.files = ["code", "commands", "crew", "page", "data", "stars", "missions"]
settings.tests = true
settings.noTalkTo = false

settings.status = [
  function() { return "<td>Stardate:</td><td>" + w.ship.getDateTime() + "</td>"; },
  function() { return "<td>Alert:</td><td>" + w.ship.getAlert() + "</td>"; },
  function() { return "<td>System:</td><td>" + stars.getSystem().alias + "</td>"; },
  function() { return "<td>Location:</td><td>" + stars.getLocation().alias + "</td>"; },
  function() { return "<td>Hull:</td><td>" + w.ship.hullIntegrity + "%</td>"; },
  function() { return "<td>Shields:</td><td>" + w.ship.shields + "</td>"; },
]

settings.libraries.push('image-pane')
settings.imageStyle = {
  right:'0',
  top:'200px',
  width:'400px',
  height:'400px',
  'background-color':'#111', 
  border:'3px black solid',
}


settings.setup = function() {
  msg("As the newly appointed captain of the Star Quest, it is up to you to keep the peace in the troubled space of  Sector 7 Iota.")
  hr()
  msg("As captain, your job is to tell others what to do - you are too value to the ship to risk on away missions.")
  msg("Assemble your crew by assigning candidates to posts on the bridge using your PAGE. Then ask the helmsman to lay in a course for sector 7 Iota. You will need a helmsman, but other posts can be left empty if you wish. You can assign officers to multiple roles, but will be less effective in both roles. Some candidates are better suited to a post than others, but it is up to you; if you want to appoint people to posts that will be poor at, go for it! Note that once you set off for Sector 7 Iota you cannot change assignments.")
  msg('The crew will call you "Sir". If you prefer "Ma\'am", tell the yeoman.')
  msg("Once you arrive at Sector 7 Iota, you will get a list of missions. You will need to prioritize. In most cases it takes about a day to travel between locations in the sector, but some locations are further out and will take longer; this will be noted in the mission. Obviously it will take a similar time to get back to a location in the central cluster.")
  hr()
  msg("Any similarity to a certain series from the sixties... and several other decades... is entirely coincidental.")
  log(getCandidates())
  let svg = []
  svg.push('<circle cx="200" cy="200" r="8" fill="yellow" stroke="none"/>')
  svg.push('<ellipse cx="200" cy="200" rx="80" ry="40" fill="none" stroke="silver"/>')
  svg.push('<ellipse cx="200" cy="200" rx="180" ry="90" fill="none" stroke="silver"/>')
  svg.push('<text class="map-text" x="0" y="12" fill="silver">Solar system</text>')
  svg.push('<text class="map-text" x="0" y="398" fill="silver">Quicksilver Starmaps</text>')
  svg.push('<text class="map-text" x="313" y="398" fill="silver">Not to scale</text>')
  draw(400, 400, svg, {destination:'quest-image'})
}


settings.startingDialogTitle = "Crew Roster"
settings.startingDialogWidth = 500
settings.startingDialogHeight = 480
settings.startingDialogOnClick = function() {
  // ...
}
settings.startingDialogInit = function() {
  //$('#namefield').focus()
}

settings.startingDialogOnClick = function() {
  settings.startingDialogEnabled = true
  const npc = w[$("#diag-name").val()]

  for (let role of roster.data) {
    const assignedNpc = roster.getOfficer(role.name)
    log(assignedNpc)
    if (assignedNpc && assignedNpc !== npc) continue
    if ($("#diag-" + role.name).is(':checked')) {
      w.ship[role.name] = npc.name
      log('Setting ' + role.name + ' to ' + npc.name)
    }
    else {
      delete w.ship[role.name]
      log('Unsetting ' + role.name)
    }
  }
  const roles = roster.getRoles(npc)
  if (roles.length === 0) {
    msg("You assign no positions to " + npc.alias + ".")
  }
  else {
    msg("You assign " + formatList(roles) + " " + npc.alias + ".")
  }
  if (roles.length === 0 && npc.loc) {
    delete npc.loc
    log(npc)
    msg(npc.leaving, {char:npc})
    io.updateUIItems()
  }
  if (roles.length !== 0 && !npc.loc) {
    npc.loc = 'room'
    log(npc)
    msg(npc.entering, {char:npc})
    io.updateUIItems()
  }
  log(w.ship)
}        
