"use strict"

settings.title = "KVonGit - QuestJS | GH Pages"
settings.author = "KV"
settings.version = "0.1"
settings.thanks = [
    'ThePix','alexwarren'
]
settings.warnings = "No warnings have been set for this game."
settings.playMode = "dev"
settings.libraries.push('item-links')
settings.getDefaultRoomHeading = function(item) { return titleCase(item.alias) }