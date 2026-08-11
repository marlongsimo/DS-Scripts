// Angriffsplaner Pro - Plan-Generierungs-Engine (Schritt 5 "Planen"). Reine
// Funktionen ohne DOM-Zugriff, arbeiten nur auf AP.state + einem übergebenen
// villagesIndex (Koordinate -> {points, name, playerId}, siehe
// angriffsplaner-v2.js für den Aufbau dieses Index aus data/{welt}-villages.json).
//
// WICHTIG: Dies ist eine gierige, prioritätsbasierte Heuristik - kein global
// optimaler Solver. Reihenfolge: Bunker -> Off -> Katta -> AG (hängt vom
// Off-Ergebnis ab) -> Fake (explizit + "restliche Dörfer").
AP.plan = AP.plan || {};

function hasEnoughUnits(attackerUnits, templateUnits) {
  return AP.UNIT_TYPES.every(function (u) {
    return (attackerUnits[u] || 0) >= (templateUnits[u] || 0);
  });
}

// Sucht unter allen Angreiferdörfern das nächstgelegene, das (a) noch Budget
// hat (bei Fakes), und (b) mindestens eine der übergebenen Vorlagen leisten
// kann (bei Fakes zusätzlich die Fakegrenze einhält). Pro Angreiferdorf wird
// die erste passende Vorlage in Listenreihenfolge genommen.
function findEligibleAttacker(targetCoord, attackers, templates, opts) {
  var best = null;
  attackers.forEach(function (a) {
    if (opts.isFake && a.fakesUsed >= a.budgetFakes) return;
    for (var i = 0; i < templates.length; i++) {
      var t = templates[i];
      if (!t || !t.units || !hasEnoughUnits(a.units, t.units)) continue;
      if (opts.isFake && opts.fakeGrenzeEnabled) {
        var popCost = AP.templatePopCost(t.units);
        var minRequired = a.points * (opts.fakeGrenzePercent / 100);
        if (popCost < minRequired) continue;
      }
      var dist = AP.coordDist(a.coord, targetCoord);
      if (!best || dist < best.dist) best = { attacker: a, template: t, dist: dist };
      break;
    }
  });
  return best;
}

function deductUnits(attacker, units) {
  AP.UNIT_TYPES.forEach(function (u) { if (units[u]) attacker.units[u] = (attacker.units[u] || 0) - units[u]; });
}

AP.plan.jitterSeconds = function () {
  return 1 + Math.floor(Math.random() * 58); // 1..58, nie exakt :00
};

// window: {date, from, to} oder null/undefined für "so früh wie möglich".
// staggerSeconds: fortlaufender Versatz, damit nicht alle Angriffe einer
// Kategorie exakt zur Fensteröffnung landen.
AP.plan.resolveArrivalTime = function (window, travelMs, avoidRoundTimes, staggerSeconds) {
  var arrival;
  if (window && window.date && window.from) {
    arrival = new Date(window.date + 'T' + window.from + ':00');
    if (staggerSeconds) arrival = new Date(arrival.getTime() + staggerSeconds * 1000);
    if (window.to) {
      var windowEnd = new Date(window.date + 'T' + window.to + ':00');
      if (arrival.getTime() > windowEnd.getTime()) arrival = windowEnd;
    }
  } else {
    arrival = new Date(Date.now() + 2 * 60 * 1000 + travelMs); // 2min Puffer + Laufzeit ab jetzt
  }
  if (avoidRoundTimes && arrival.getSeconds() === 0) {
    arrival = new Date(arrival.getTime() + AP.plan.jitterSeconds() * 1000);
  }
  return { arrivalTime: arrival, sendTime: new Date(arrival.getTime() - travelMs) };
};

// ── Angreifer-/Ziel-Pools ─────────────────────────────────────────────────

AP.plan.buildAttackerPool = function (state, villagesIndex) {
  var unavailable = {};
  AP.parseCoordsFreeform(state.unavailableOffs).forEach(function (c) { unavailable[c] = true; });

  var out = [];
  Object.keys(state.troops).forEach(function (playerId) {
    var entry = state.troops[playerId];
    var playerMeta = state.players.allies.filter(function (p) { return String(p.id) === String(playerId); })[0];
    var playerName = (playerMeta && playerMeta.name) || playerId;
    (entry.villages || []).forEach(function (v) {
      if (unavailable[v.coord]) return;
      var info = villagesIndex[v.coord];
      out.push({
        playerId: playerId,
        playerName: playerName,
        coord: v.coord,
        villageName: v.villageName || (info && info.name) || v.coord,
        points: info ? info.points : 0,
        units: Object.assign({}, v.units),
        fakesUsed: 0,
        budgetFakes: state.settings.maxFakesPerVillage
      });
    });
  });
  return out;
};

AP.plan.buildTargetPools = function (state, villagesIndex) {
  var used = {};
  function toTargets(coords) {
    coords.forEach(function (c) { used[c] = true; });
    return coords.map(function (c) {
      var info = villagesIndex[c];
      return { coord: c, incsUsed: 0, points: (info && info.points) || 0 };
    });
  }

  var off = toTargets(state.targets.offTargets);
  var katta = toTargets(state.targets.kattaTargets);
  var ag = toTargets(state.targets.agTargets);
  var fake = toTargets(state.targets.fakeTargets.slice());
  // Bunker separat (eigene Zuteilungslogik in assignBunkers), aber trotzdem
  // "verbraucht" markieren, damit sie nicht zusätzlich als Fake-Rest gelten.
  state.targets.bunkers.coords.forEach(function (c) { used[c] = true; });

  if (state.targets.fakeRemainingToggle) {
    var enemyIds = {};
    state.players.enemies.forEach(function (p) { enemyIds[String(p.id)] = true; });
    Object.keys(villagesIndex).forEach(function (coord) {
      if (used[coord]) return;
      var info = villagesIndex[coord];
      if (!info || !enemyIds[String(info.playerId)]) return;
      fake.push({ coord: coord, incsUsed: 0, points: info.points || 0 });
      used[coord] = true;
    });
  }

  return { off: off, katta: katta, ag: ag, fake: fake };
};

// ── Zuteilung: Bunker (globaler Sprengen/Faken-Modus + feste Offs/Bunker) ──

AP.plan.assignBunkers = function (bunkerConfig, attackers, templates, settings) {
  var attacks = [];
  var unassignedBunkers = [];
  var isFake = bunkerConfig.mode === 'fake';
  var templateList = isFake ? templates.fake : templates.off;
  var perBunker = Math.max(1, bunkerConfig.offsPerBunker || 1);
  var staggerCounter = 0;
  var capacityExhausted = false;

  for (var i = 0; i < bunkerConfig.coords.length; i++) {
    var coord = bunkerConfig.coords[i];
    if (capacityExhausted) {
      unassignedBunkers.push({ coord: coord, sent: 0, needed: perBunker });
      continue;
    }
    var incsUsed = 0;
    var sentForThisBunker = 0;
    for (var n = 0; n < perBunker; n++) {
      if (incsUsed >= settings.maxIncsPerTarget) break;
      var found = findEligibleAttacker(coord, attackers, templateList, {
        isFake: isFake, fakeGrenzeEnabled: settings.fakeGrenzeEnabled, fakeGrenzePercent: settings.fakeGrenzePercent
      });
      if (!found) { capacityExhausted = true; break; }
      var travelMs = AP.calcTravelMs(AP.slowestUnit(found.template.units), found.dist);
      var timing = AP.plan.resolveArrivalTime(settings.timeWindows.bunker, travelMs, settings.avoidRoundTimes, staggerCounter);
      staggerCounter += 3;
      deductUnits(found.attacker, found.template.units);
      if (isFake) found.attacker.fakesUsed++;
      incsUsed++;
      sentForThisBunker++;
      attacks.push({
        playerId: found.attacker.playerId, playerName: found.attacker.playerName,
        originCoord: found.attacker.coord, originVillageName: found.attacker.villageName,
        targetCoord: coord, category: isFake ? 'bunker-fake' : 'bunker-blast', templateName: found.template.name,
        units: Object.assign({}, found.template.units),
        sendTime: timing.sendTime, arrivalTime: timing.arrivalTime, travelMs: travelMs
      });
    }
    if (sentForThisBunker < perBunker) {
      unassignedBunkers.push({ coord: coord, sent: sentForThisBunker, needed: perBunker });
    }
  }

  return { attacks: attacks, unassignedBunkers: unassignedBunkers };
};

// ── Zuteilung: generische Kategorie (Off/Katta/Fake) ───────────────────────

AP.plan.assignCategory = function (pool, attackers, templates, category, settings, isFake) {
  var attacks = [];
  var unassigned = [];
  var staggerCounter = 0;

  // Ziele nach Entfernung zum jeweils nächstgelegenen Angreifer sortiert
  // (nächste zuerst) - füllt "leichte" Zuordnungen zuerst auf.
  var withDist = pool.map(function (t) {
    var minDist = Infinity;
    attackers.forEach(function (a) {
      var d = AP.coordDist(a.coord, t.coord);
      if (d < minDist) minDist = d;
    });
    return { target: t, minDist: minDist };
  }).sort(function (a, b) { return a.minDist - b.minDist; });

  withDist.forEach(function (entry) {
    var target = entry.target;
    if (target.incsUsed >= settings.maxIncsPerTarget) { unassigned.push(target); return; }
    var found = findEligibleAttacker(target.coord, attackers, templates, {
      isFake: isFake, fakeGrenzeEnabled: settings.fakeGrenzeEnabled, fakeGrenzePercent: settings.fakeGrenzePercent
    });
    if (!found) { unassigned.push(target); return; }

    var window = settings.timeWindows[category];
    var travelMs = AP.calcTravelMs(AP.slowestUnit(found.template.units), found.dist);
    var timing = AP.plan.resolveArrivalTime(window, travelMs, settings.avoidRoundTimes, staggerCounter);
    staggerCounter += 3;

    deductUnits(found.attacker, found.template.units);
    if (isFake) found.attacker.fakesUsed++;
    target.incsUsed++;

    attacks.push({
      playerId: found.attacker.playerId, playerName: found.attacker.playerName,
      originCoord: found.attacker.coord, originVillageName: found.attacker.villageName,
      targetCoord: target.coord, category: category, templateName: found.template.name,
      units: Object.assign({}, found.template.units),
      sendTime: timing.sendTime, arrivalTime: timing.arrivalTime, travelMs: travelMs
    });
  });

  return { attacks: attacks, unassigned: unassigned };
};

// ── Zuteilung: AG-Ziele (synchron mit letztem Off-Angriff auf dasselbe Dorf) ─

AP.plan.assignAgTargets = function (agPool, offAttacks, attackers) {
  var attacks = [];
  var unassigned = [];

  var lastOffArrivalByTarget = {};
  offAttacks.forEach(function (a) {
    var existing = lastOffArrivalByTarget[a.targetCoord];
    if (!existing || a.arrivalTime.getTime() > existing.getTime()) {
      lastOffArrivalByTarget[a.targetCoord] = a.arrivalTime;
    }
  });

  agPool.forEach(function (target) {
    var refArrival = lastOffArrivalByTarget[target.coord];
    if (!refArrival) {
      unassigned.push({ coord: target.coord, reason: 'Kein Off-Angriff auf dieses Ziel geplant, Synchronisation nicht möglich' });
      return;
    }
    var best = null;
    attackers.forEach(function (a) {
      if ((a.units.snob || 0) < 4) return;
      var dist = AP.coordDist(a.coord, target.coord);
      if (!best || dist < best.dist) best = { attacker: a, dist: dist };
    });
    if (!best) {
      unassigned.push({ coord: target.coord, reason: 'Kein Dorf mit mindestens 4 Adelsgeschlecht verfügbar' });
      return;
    }
    var travelMs = AP.calcTravelMs('snob', best.dist);
    var sendTime = new Date(refArrival.getTime() - travelMs);
    best.attacker.units.snob -= 4;
    attacks.push({
      playerId: best.attacker.playerId, playerName: best.attacker.playerName,
      originCoord: best.attacker.coord, originVillageName: best.attacker.villageName,
      targetCoord: target.coord, category: 'ag', templateName: 'Adelsangriff (4 AGs, synchron mit letztem Off)',
      units: { snob: 4 }, sendTime: sendTime, arrivalTime: refArrival, travelMs: travelMs
    });
  });

  return { attacks: attacks, unassigned: unassigned };
};

// ── Orchestrierung ──────────────────────────────────────────────────────

AP.plan.runPlan = function (state, villagesIndex) {
  var attackers = AP.plan.buildAttackerPool(state, villagesIndex);
  var pools = AP.plan.buildTargetPools(state, villagesIndex);

  var allAttacks = [];
  var unassignedTargets = [];

  var bunkerResult = AP.plan.assignBunkers(state.targets.bunkers, attackers, state.templates, state.settings);
  allAttacks = allAttacks.concat(bunkerResult.attacks);
  bunkerResult.unassignedBunkers.forEach(function (b) {
    unassignedTargets.push({ coord: b.coord, category: 'bunker', reason: b.sent + '/' + b.needed + ' Offs gesendet' });
  });

  var offResult = AP.plan.assignCategory(pools.off, attackers, state.templates.off, 'off', state.settings, false);
  allAttacks = allAttacks.concat(offResult.attacks);
  offResult.unassigned.forEach(function (t) { unassignedTargets.push({ coord: t.coord, category: 'off', reason: 'keine passende Zuteilung gefunden' }); });

  var kattaResult = AP.plan.assignCategory(pools.katta, attackers, state.templates.katta, 'katta', state.settings, false);
  allAttacks = allAttacks.concat(kattaResult.attacks);
  kattaResult.unassigned.forEach(function (t) { unassignedTargets.push({ coord: t.coord, category: 'katta', reason: 'keine passende Zuteilung gefunden' }); });

  var agResult = AP.plan.assignAgTargets(pools.ag, offResult.attacks, attackers);
  allAttacks = allAttacks.concat(agResult.attacks);
  agResult.unassigned.forEach(function (t) { unassignedTargets.push({ coord: t.coord, category: 'ag', reason: t.reason }); });

  var fakeResult = AP.plan.assignCategory(pools.fake, attackers, state.templates.fake, 'fake', state.settings, true);
  allAttacks = allAttacks.concat(fakeResult.attacks);
  fakeResult.unassigned.forEach(function (t) { unassignedTargets.push({ coord: t.coord, category: 'fake', reason: 'keine passende Zuteilung gefunden (Budget/Fakegrenze/Truppen)' }); });

  var leftoverAttackerCapacity = attackers.filter(function (a) {
    return AP.UNIT_TYPES.some(function (u) { return (a.units[u] || 0) > 0; });
  }).map(function (a) {
    return { coord: a.coord, playerName: a.playerName, remainingUnits: a.units };
  });

  var byPlayer = {};
  allAttacks.forEach(function (a) {
    if (!byPlayer[a.playerId]) byPlayer[a.playerId] = { playerId: a.playerId, playerName: a.playerName, attacks: [] };
    byPlayer[a.playerId].attacks.push(a);
  });
  var groups = Object.keys(byPlayer).map(function (id) {
    var g = byPlayer[id];
    g.attacks.sort(function (a, b) { return a.sendTime.getTime() - b.sendTime.getTime(); });
    return g;
  }).sort(function (a, b) { return a.playerName.localeCompare(b.playerName, 'de'); });

  return {
    generatedAt: new Date(),
    groups: groups,
    totalAttacks: allAttacks.length,
    unassignedTargets: unassignedTargets,
    leftoverAttackerCapacity: leftoverAttackerCapacity
  };
};
