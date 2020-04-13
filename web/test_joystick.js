 
joystickL.on('start end', function(evt, dataL) { 
												console.log(dataL.position);
											  }).on('move', function(evt, dataL) {
																					console.log(dataL.position);
																				});

joystickR.on('start end', function(evt, dataR) { 
												console.log(dataR.position);
											  }).on('move', function(evt, dataR) {
																					console.log(dataR.position);
																				});