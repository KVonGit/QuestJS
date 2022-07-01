"use strict";




// Give a character a modifyOutgoingAttack function to have it modify an attack the character is making
// or modifyIncomingAttack for an attack it is receiving
const RPG_TEMPLATE = {
  rpgCharacter:true,
  offensiveBonus:0,
  spellCasting:0,
  maxNumberOfRings:settings.maxNumberOfRings,
  afterLoadForTemplate:function() {
    if (this.agenda && this.agenda[0].startWith('guardExit')) this.setGuardFromAgenda(this.agenda[0].split(':').shift())
    log("loaded!")
  },
  getOffensiveBonus:function(skill) {
    if (!skill.statForOffensiveBonus) {
      return this.offensiveBonus
    }
    else if (this[skill.statForOffensiveBonus] !== undefined) {
      return this[skill.statForOffensiveBonus]
    }
    else {
      return 0
    }
  },
  defensiveBonus:0,
  spellDefensiveBonus:0,
  // call this to flag as dead - no output
  terminate:function(attack) {
    if (this.dead) return

    if (this.afterDeath) this.afterDeath(this)
    if (attack) {
      attack.msg(this.msgDeath, 1)
    }
    else {
      msg(this.msgDeath, 1)
    }

    this.dead = true
    this.suspended = true
    if (this.noCorpse) {
      rpg.destroy(this)
    }
  },
  testManipulate:function() {
    if (this.dead) return falsemsg(lang.npc_dead)
    if (this.manipulateProhibited) return falsemsg(this.manipulateProhibited)
    return true
  },
  testTalk:function() {
    if (this.dead) return falsemsg(lang.npc_dead)
    if (this.talkProhibited) return falsemsg(this.talkProhibited)
    return true
  },
  getDefensiveBonus:function(skill) {
    if (!skill.statForDefensiveBonus) {
      return this.defensiveBonus
    }
    else if (this[skill.statForDefensiveBonus] !== undefined) {
      return this[skill.statForDefensiveBonus]
    }
    else {
      return 0
    }
  },
  // Can be called to have the NPC resume its original agenda, as long as
  // the NPC can return to the starting location and the original settings
  // were saved.
  agendaRestart:function() {
    if (!this.agendaOriginalSettings) return
    if (this.agendaDoNotResume) return
    
    this.agenda = [
      "guardWalkTo:" + this.agendaOriginalSettings.loc,
      this.agendaOriginalSettings.action + ":" + this.agendaOriginalSettings.data.join(':'),
    ]
  },
  armour:0,
  isLight:false,  // should this be on default items?
  activeEffects:[],
  skillsLearnt:[],
  
  dead:false,
  asleep:false,
  stunned:0,
  petrified:false,
  blinded:false,
  signalResponses:{},
  cooldown:-1,

  // player attacks this
  attack:function(options) {
    // Create an attack, based on the current skill, weapon and given target
    const attack = Attack.createAttack(options.char, this)
    if (!attack) return false
    attack.apply().output()
      
    //msg(attack.result.join(''))
    return true;
  },

  modifyOutgoingAttack:function(attack) { },
  
  getEquippedWeapon:function() { return this },
  
  getEquippedShield:function() { return null },
  
  getArmour:function() { return this.armour },

  hasEffect:function(name) { return this.activeEffects.includes(name) },
  
  getCooldownDelay:function(skill) { return skill.level ? skill.level : 0 },
  
  lightSource:function() { return this.isLight ? world.LIGHT_FULL : world.LIGHT_NONE },

  isSpellLearningAllowed:function(spell) {
    if (!spell instanceof Spell) return errormsg("That is not a spell: " + spell.name)
    if (!this.maxSpellLevel) return true
    if (!spell.level) return errormsg("Spell has no level: " + spell.name)

    const options = {char:this, spell:spell}
    if (spell.level > this.maxSpellLevel()) return falsemsg(lang.cannotLearnSpellLevel, options)
    if (this.maxSpellPoints) {
      let count = 0
      for (const name of this.skillsLearnt) {
        const skill = rpg.findSkill(name)
        if (!skill instanceof Spell) continue
        count += skill.level
      }
      if ((count + spell.level) > this.maxSpellPoints()) return falsemsg(lang.cannotLearnSpellLimit, options)
    }
    return true
  },
}



const RPG_PLAYER = function(female) {
  const res = PLAYER(female)
  
  for (let key in RPG_TEMPLATE) res[key] = RPG_TEMPLATE[key]
  
  //res.getEquippedWeapon = function() { return this.equipped ? w[this.equipped] : w.weapon_unarmed; }
  
  res.allegiance = 'friend'
  res.getEquippedWeapon = function() {
    const carried = scopeHeldBy(this)
    return carried.find(el => el.equipped && el.weapon) || w.weapon_unarmed
  }

  res.getEquippedShield = function() {
    const carried = scopeHeldBy(this)
    return carried.find(el => el.equipped && el.shield)
  }

  res.getArmour = function() {
    const garments = scopeHeldBy(this).filter(el => el.worn)
    let armour = 0
    for (let el of garments) armour += el.getArmour()
    return armour / settings.armourScaling
  }

  res.afterCreation = function(o) {
    if (!o.maxHealth) o.maxHealth = o.health
  }

  res.endTurn = function(turn) {
    log('here')
    this.cooldown--
    this.doEvent(turn) 
  }

  return res;
}

const RPG_NPC = function(female) {
  const res = NPC(female)

  for (let key in RPG_TEMPLATE) res[key] = RPG_TEMPLATE[key]
  
  res.allegiance = 'foe'
  res.hostile = false
  res.oldRpgOnCreation = res.afterCreation
  res.skillOptions = ['Basic attack']
  res.afterCreation = function(o) {
    o.oldRpgOnCreation(o)
    if (!o.maxHealth) o.maxHealth = o.health
    o.verbFunctions.push(function(o, verbList) {
      verbList.push(lang.verbs.attack)
    })
    o.nameModifierFunctions.push(function(o, list) {
      if (o.dead) list.push(lang.invModifiers.dead)
    })
  }
  
  res.msgDeath = lang.deathGeneral
  
  // An NPC is hostile if aggression is true and it is targeting the given character or an allied one
  res.isHostile = function(chr) {
    if (!this.hostile) return false
    if (!chr) chr = player
    if (!this.target) this.target = player.name
    if (this.target === chr.name) return true
    if (!this.target) return errormsg("Oh dear, no target set for this NPC")
    if (w[this.target].allegiance === chr.allegiance) return true
    return false
  }
  res.foeTrackingMode = "follow"
  res.foeTrackingSpeed = "medium"
  res.guardActionMode = "preventAndAttack"

  res.setGuard = function(dir, reaction) {
    this.guardingLoc = this.loc
    const room = w[this.loc]
    if (typeof reaction === 'function') {
      this.guardingReaction = reaction
      delete this.guardingComment
    }
    else {
      this.guardingComment = reaction
      delete this.guardingReaction
    }
    if (dir) { // false, to guard room
      this.guardingDir = dir
      if (!room[dir + '_guardedBy']) room[dir + '_guardedBy'] = []
      if (!room[dir + '_guardedBy'].includes(this.name)) room[dir + '_guardedBy'].push(this.name)
      //log("Guarding " + dir + " exit of " + this.guardingLoc)
    }
    else {
      this.isGuardingFunction = function() {
        // ultimately want this to work for NPCs intruding too
        if (currentLocation.name === this.guardingLoc) {
          if (this.guardingComment) msg(this.guardingComment, {char:player, exit:this})
          if (this.guardingReaction) this.guardingReaction(player, this)
        }
      }
      //if (!room.guardedBy) room.guardedBy = []
      //if (!room.guardedBy.includes(this.name)) room.guardedBy.push(this.name)
      //log("Guarding " + this.guardingLoc)
    }
  },
  res.unsetGuard = function() {
    array.remove(w[this.guardingLoc][this.guardingDir + '_guardedBy'], this.name)
    delete this.guardingLoc
    delete this.guardingDir
    delete this.isGuardingFunction
  },
  res.isGuarding = function(exitOrRoom) {
    if (this.dead) return false
    if (exitOrRoom.room) {
      return exitOrRoom.name === this.guardingLoc && this.loc === this.guardingLoc
    }
    else {
      return exitOrRoom.origin.name === this.guardingLoc && exitOrRoom.dir === this.guardingDir && this.loc === this.guardingLoc
    }
  },



  res.selectSkill = function() {
    //return this.skillOptions ? rpg.findSkill(random.fromArray(this.skillOptions)) : defaultSkill 
    if (!this.skillOptions) return defaultSkill
    const skillName = random.fromArray(this.skillOptions)
    return rpg.findSkill(skillName)
  }

  res.examine = function(options) {
    let s = typeof this.ex === 'function' ? this.ex() : this.ex
    if (!s) return util.returnAndLog(undefined, 'Warning for ' + this.name + ': The "ex" attribute for this NPC is neither a string nor a function')
    if (this.dead) {
      if (this.exDead) {
        s = this.exDead
      }
      else {
        s += lang.deadAddendum
      }
    }
    else if (this.asleep) {
      if (this.exAsleep) {
        s = this.exAsleep
      }
      else {
        s += lang.asleepAddendum
      }
    }
    else {
      if (this.health < this.maxHealth / 5) {
        s += lang.badlyInjuredAddendum
      }
      else if (this.health < this.maxHealth / 2) {
        s += lang.injuredAddendum
      }
    }
    if (settings.includeHitsInExamine) {
      s += ' {class:tactical:Hits: ' + this.health + '/' + this.maxHealth + '.}'
    }
    msg(s, options)
  }
  
 
  
  // Attempt to make an attack on the given target.
  // Will return the attack itself if an attack is actually made or null otherwise.
  res.performAttack = function(target) {
    
    if (target.dead) return null

    // Is the target reachable?
    if (this.loc !== target.loc) return null

    let skill
    if (this.nextAttack) {
      skill = rpg.findSkill(this.nextAttack)
      delete this.nextAttack
    }
    else {
      skill = this.selectSkill()
    }
    const attack = Attack.createAttack(this, target, skill)
    attack.apply().output()
    return attack
  }
  
  res.antagonise = function(attacker) {
    if (this.allegiance === 'friend' && attacker === player) {
      this.allegiance ='foe'
    }
    if (this.signalGroups && this.signalGroups.length) {
      rpg.broadcastAll('attack', this, attacker)
    }
    else {
      rpg.broadcastCommunication(this, 'attack', this, attacker)
    }      
  }

  res.endTurn = function(turn) {
    if (this.dead) return
    this.sayTakeTurn()
    this.doReactions()
    this.cooldown--

    // Do we attack?
    // if isGuardingFunction function we let that handle it
    // if agenda, let that handle it
    // otherwise if hoistile and has target, then attack
    // (unless delayAttack is true, eg the NPC has already acted)
    if (this.isGuardingFunction) {
      this.isGuardingFunction()
    }
    else if (!this.paused && !this.suspended && this.agenda && this.agenda.length > 0) {
      this.doAgenda()
    }
    else if (this.hostile && this.target) {
      // Is the NPC now hostile? If so, have an attack
      const target = w[this.target]
      const attack = this.performAttack(target)
      if (attack === null) {
        // target is at another location
        if (this.pursueToAttack) this.pursueToAttack(target)
      }
    }
    this.doEvent(turn)
  }
  
  return res;
}


const RPG_FRIEND = function(female) {
  const res = RPG_NPC(female)
  res.allegiance = 'friend'
}

const RPG_CORPOREAL_UNDEAD = function() {
  const res = RPG_NPC();
  res.element = 'necrotic'
  res.pronouns = lang.pronouns.thirdperson
  res.msgDeath = lang.deathUndead
  res.poisonImmunity = true
  res.msgPoisonImmunity = "Poison has no effect on the undead!"
  return res
}

const RPG_NON_CORPOREAL_UNDEAD = function() {
  const res = RPG_CORPOREAL_UNDEAD();
  res.noCorpse = true
  res.msgDeath = lang.deathUndeadNoCorpse
  res.modifyIncomingAttack = function(attack) {
    if (attack.element || attack.isMagic || attack.spell) {
      attack.damageMultiplier = 0
      attack.primarySuccess = attack.primarySuccess.replace(/[.!]/, ", but it passes straight through {sb:target}.")
    }
  }
  return res
}

const RPG_PHANTOM = function() {
  const res = RPG_NPC();
  res.element = 'rainbow'
  res.noCorpse = true
  res.msgDeath = lang.deathPhantom
  res.pronouns = lang.pronouns.thirdperson
  res.poisonImmunity = true
  res.msgPoisonImmunity = "Poison has no effect for some reason..."
  res.unillusionable = true
  res.unillusion = function(attack) {
    attack.msg("{nv:target:disappear:true}.", 1)
    if (this.clonePrototype) {
      delete w[this.name]
    }
    else {
      delete w[this.name].loc
    }
  }
  return res
}

const RPG_ELEMENTAL = function(element) {
  const res = RPG_NPC()
  res.element = element
  res.noCorpse = true
  res.msgDeath = lang.deathElemental
  res.pronouns = lang.pronouns.thirdperson
  res.poisonImmunity = true
  res.msgPoisonImmunity = "Poison has no effect on elementals!"
  return res
}

const RPG_CONSTRUCT = function() {
  const res = RPG_NPC()
  res.msgDeath = lang.deathConstruct
  res.pronouns = lang.pronouns.thirdperson
  res.poisonImmunity = true
  res.msgPoisonImmunity = "Poison has no effect on constructs!"
  return res
}

const RPG_DEMON = function() {
  const res = RPG_NPC()
  res.msgDeath = lang.deathConstruct
  res.pronouns = lang.pronouns.thirdperson
  res.poisonImmunity = true
  res.msgPoisonImmunity = "Poison has no effect on demons!"
  return res
}

const RPG_CORRUPTED = function() {
  const res = RPG_NPC()
  res.msgDeath = lang.deathConstruct
  res.pronouns = lang.pronouns.thirdperson
  return res
}

const RPG_CREATED = function() {
  const res = RPG_NPC()
  res.msgDeath = lang.deathConstruct
  res.pronouns = lang.pronouns.thirdperson
  return res
}

const RPG_PLANT = function() {
  const res = RPG_NPC()
  res.msgDeath = lang.deathConstruct
  res.pronouns = lang.pronouns.thirdperson
  return res
}

const RPG_FEY = function(female) {
  const res = RPG_NPC(female);

  res.fey = true
    
  return res
}

const RPG_BEAST = function(female, hostile) {
  const res = RPG_NPC(female);

  res.beast = true
  res.hostile = hostile  // !!! needs to be set via agenda
  res.testTalk = function() {
    if (this.dead) return falsems(lang.npc_dead)
    if (this.activeEffects.includes(lang.communeWithAnimalSpell)) return true
    return falsemsg(lang.cannotTalkToBeast, {item:this, char:player})
  }
    
  return res
}






