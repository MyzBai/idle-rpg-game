import * as eventListener from "./eventListener.js";
import * as enemy from "./sub-modules/enemy.js";
import * as save from "./save.js";
import * as gameLoop from "./gameLoop.js";
import { init as initGame } from "./init-game.js";
export {};

//inject the dev tools in p-game
const devTools = createDevTools();
document.querySelector(".p-game > .s-top").appendChild(devTools);
setStatus('stop');
eventListener.add(eventListener.EventType.RESET, () => {
	setStatus("stop");
});

function createDevTools() {
	const fieldset = document.createElement("fieldset");
	fieldset.insertAdjacentHTML("afterbegin", "<legend>Dev Tools</legend>");
	fieldset.insertAdjacentHTML("afterbegin", '<label class="status">Status: <span style="color: red;">stopped</span></label>');
	const frag = document.createDocumentFragment();
	const content = document.createElement("div");
	frag.appendChild(content);
	content.style.display = "flex";
	content.appendChild(createButton("Save", save.save));
	content.appendChild(
		createButton(
			"Start",
			() => {setStatus('start')},
			"start-game-loop-btn"
		)
	);
	content.appendChild(
		createButton(
			"Stop",
            () => {setStatus('stop')},
			"stop-game-loop-btn"
		)
	);
	content.appendChild(
		createButton("Reset", () => {
			save.removeItem();
			eventListener.invoke(eventListener.EventType.RESET);
			initGame();
		})
	);
	content.appendChild(
		createButton("Kill Enemy", () => {
			enemy.die();
		})
	);
	fieldset.appendChild(frag);
	console.log(fieldset.children);

	return fieldset;
}

function createButton(title, callback, classList) {
	const element = document.createElement("div");
	element.innerText = title;
	element.classList.add("g-button", classList);
	element.addEventListener("click", callback);
	return element;
}

function setStatus(status) {
	switch (status) {
		case "start":
            devTools.querySelector(".start-game-loop-btn").classList.add("active");
            devTools.querySelector(".stop-game-loop-btn").classList.remove("active");
            devTools.querySelector(".status span").innerHTML = "running";
            devTools.querySelector(".status span").style.color = "green";
            gameLoop.start();
			break;
		case "stop":
            devTools.querySelector(".start-game-loop-btn").classList.remove("active");
            devTools.querySelector(".stop-game-loop-btn").classList.add("active");
            devTools.querySelector(".status span").innerHTML = "stopped";
            devTools.querySelector(".status span").style.color = "red";
            gameLoop.stop();
			break;
	}
}
