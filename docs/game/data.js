"use strict"

createItem("me", PLAYER(), {
  loc:"home",
  synonyms:['me', 'myself'],
  examine: "Just a regular guy.",
})

createRoom("home", {
  desc: 'There are many commands you can use here, but the most helpful is probably HELP.',
})

createItem("wiki", {
  loc:"home",
  examine: '<a target="_blank" href="https://github.com/ThePix/QuestJS/wiki/">QuestJS Wiki</a>',
})

createItem("discussions", {
  loc:"home",
  pronouns:lang.pronouns.plural,
  properNoun:true,
  examine: '<a target="_blank" href="https://github.com/ThePix/QuestJS/discussions/">QuestJS Discussions</a>',
})

createItem("issues", {
  loc:"home",
  pronouns:lang.pronouns.plural,
  properNoun:true,
  examine: '<a target="_blank" href="https://github.com/ThePix/QuestJS/issues/">QuestJS Issues</a>',
})