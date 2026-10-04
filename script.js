const taskInput = document.querySelector("#taskInput");

const addButton = document.querySelector("#addButton");

const taskList = document.querySelector("#taskList");

addButton.addEventListener("click", function () {

    const taskText = taskInput.value;

    console.log(taskText);

});