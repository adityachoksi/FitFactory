$(document).ready(function () {
  //initialize variables to track information as the app is running
  var messageCount = 0,
    activeMessages = 0,
    restingMessages = 0,
    calories = 0,
    calorieGoal = 0,
    totalHeartrate = 0,
    restingHeartrate = 0,
    activeHeartrate = 0,
    targetRate = 0,
    age = 0,
    agestr = "",
    weight = 0,
    totalreps = 0,
    infoSet = false,
    currentSets = 0,
    state = 0,
    currentStateDuration = 0,
    restDuration = 30,
    setDuration = 60,
    totalSets = 4,
    fatlevel = 5;

    //creates an array that tells script where to find images to display
    var images = [], x = 0;
    images[0] = "../images/Fat0.png";
    images[1] = "../images/Fat1.png";
    images[2] = "../images/Fat2.png";
    images[3] = "../images/Fat3.png";
    images[4] = "../images/Fat4.png";
    images[5] = "../images/Fat5.png";

    //stores workout messages
    var workouts = [], y = 0;
    workouts[0] = "Do Jumping Jacks for 60 Seconds.";
    workouts[1] = "Do High Knees for 60 Seconds.";
    workouts[2] = "Do Jumping Squats for 60 Seconds.";
    workouts[3] = "Do Butt Kickers for 60 Seconds.";

  
  //creates a chart that plots the data received from the server
  var timeData = [],
    heartData = [],
    movementData = [];
  var data = {
    labels: timeData,
    datasets: [
      {
        fill: false,
        label: 'Heartrate',
        yAxisID: 'Heartrate',
        borderColor: "rgba(255, 0, 0, 1)",
        pointBoarderColor: "rgba(255, 0, 0, 1)",
        backgroundColor: "rgba(255, 0, 0, 0.4)",
        pointHoverBackgroundColor: "rgba(255, 0, 0, 1)",
        pointHoverBorderColor: "rgba(255, 0, 0, 1)",
        data: heartData
      },
      {
        fill: false,
        label: 'Movement',
        yAxisID: 'Movement',
        borderColor: "rgba(24, 120, 240, 1)",
        pointBoarderColor: "rgba(24, 120, 240, 1)",
        backgroundColor: "rgba(24, 120, 240, 0.4)",
        pointHoverBackgroundColor: "rgba(24, 120, 240, 1)",
        pointHoverBorderColor: "rgba(24, 120, 240, 1)",
        data: movementData
      }
    ]
  };

  var basicOption = {
    title: {
      display: true,
      text: 'Heartrate & Movement Real-time Data',
      fontSize: 36
    },
    scales: {
      yAxes: [{
        id: 'Heartrate',
        type: 'linear',
        scaleLabel: {
          labelString: 'Heartrate(bpm)',
          display: true
        },
        position: 'left',
      }, {
          id: 'Movement',
          type: 'linear',
          scaleLabel: {
            labelString: 'Movement(steps)',
            display: true
          },
          position: 'right'
        }]
    }
  };

  //Get the context of the canvas element we want to select
  var ctx = document.getElementById("myChart").getContext("2d");
  var optionsNoAnimation = { animation: false };
  var myLineChart = new Chart(ctx, {
    type: 'line',
    data: data,
    options: basicOption
  });


  //connects to the server
  var ws = new WebSocket('wss://' + location.host);
  ws.onopen = function () {
    console.log('Successfully connect WebSocket');
  };

  //every time the servers sends a message, this function is called
  ws.onmessage = function (message) {
  /*
  The app tracks its state, and each possible state is assigned a numerical value
  0: Initial Calibration, the app waits for the device to connect to the IoT hub and start 
     sending messages and the user to input their age and weight
  1: Initial Reading, the user holds still while the particle sensor takes readings of their
     pulse, these readings are plotted and the app also displays the average resting heart
     rate based on these readings
  2: Exercise, the app displays what exercise the user has to do and plots movement data 
     from the accelerometer which shows how many reps the user did in the last 10 seconds
  3: Rest, the user holds still again as more heartrate readings are displayed on the graph. 
     These readings are elevated now that the user has been active. These readings are used
     to calculate calories burned.
  4: Workout Complete, the app stops plotting data and displays some final statistics

  note: since we built our project on the code from Demo 4, the data sent by the server
  still has some of its older naming. The heartrate data is stored in obj.temperature and 
  the movement data is stored in obj.humidity
  */

    //increment the total messageCount and current state duration  
    messageCount++;
    currentStateDuration += 10;

    console.log('receive message' + message.data);
    try {
      var obj = JSON.parse(message.data);
      if(!obj.time || !obj.temperature) {
        return;
      }
      
      //In the Excercise state, set heartrate to 0 on the graph because the readings
      //are inaccurate
      if(state == 2){
        obj.temperature = 0;
      }
      //In the Rest state, set movement to 0 on the graph because these movements are not 
      //actual reps
      if(state != 2){
          obj.humidity = 0;
      }
      
      //Only plot points after calibration and before workout ends
      if(state !== 0 && state != 4){
          timeData.push(messageCount*10);
          heartData.push(obj.temperature);
          movementData.push(obj.humidity);
      }
      // only keep no more than 50 points in the line chart
      const maxLen = 50;
      var len = timeData.length;
      if (len > maxLen) {
        timeData.shift();
        heartData.shift();
        movementData.shift();
      }


      /*
      The two sections below add the readings to a variable that track the total while 
      incrementing a count that shows how many readings of that type have been stored
      in this sum. We can find the average value for each by dividing by these reading counts.
      A new message is sent to the server every 10 seconds so it is easy to convert between 
      messages and time in seconds.
      */
      //updating total heartrate based on new data during rest states
      if(state == 1 || state == 3){
        restingMessages++;
        totalHeartrate += obj.temperature;
      }
      //updating rep data based on new data during active states
      if(state == 2){
        activeMessages++;
        totalreps += obj.humidity;
        document.getElementById("reps").innerHTML = "Total Reps: " + totalreps;
        document.getElementById("rps").innerHTML = "Avg Reps/Second: " + (totalreps/(activeMessages*10)).toFixed(3);

      }
      //updates the chart based on new data
      myLineChart.update();
      

      //updates image and grade based on how many calories have been burnt out of the goal
      var img = document.getElementById("fatty");
        
        if (fatlevel == 5 && calories/calorieGoal >= 0.2) {
            fatlevel = 4;
            img.src = images[fatlevel];
            img.alt = "fat4";
            document.getElementById("grade").innerHTML = "Fitness Grade: D" ;
            
        }
        if (fatlevel == 4 && calories/calorieGoal >= 0.4) {
            fatlevel = 3;
            img.src = images[fatlevel];
            img.alt = "fat3";
            document.getElementById("grade").innerHTML = "Fitness Grade: C" ;
            
        }
        if (fatlevel == 3 && calories/calorieGoal >= 0.6) {
            fatlevel = 2;
            img.src = images[fatlevel];
            img.alt = "fat2";
            document.getElementById("grade").innerHTML = "Fitness Grade: B" ;
        }
        if (fatlevel == 2 && calories/calorieGoal >= 0.8) {
            fatlevel = 1;
            img.src = images[fatlevel];
            img.alt = "fat1";
            document.getElementById("grade").innerHTML = "Fitness Grade: A" ;
        }
        if (fatlevel == 1 && calories/calorieGoal >= 1) {
            fatlevel = 0;
            img.src = images[fatlevel];
            img.alt = "skinniest";
            document.getElementById("grade").innerHTML = "Fitness Grade: A++" ;
        }
      
      /*
      shifting from calibration to initial rest state
      retrieves height and weight from HTML document
      this cannot happen until the app receives a message from the server
      messages are only sent after the device has calibrated
      */
      if(!infoSet){
        agestr = document.getElementById('age').innerHTML;
        if(agestr.slice(-1) != "?"){
          infoSet = true;
          age = parseInt(agestr.slice(agestr.indexOf(" ")));
          var wtstr = document.getElementById('wt').innerHTML;
          weight = parseInt(wtstr.slice(wtstr.indexOf(" ")));
          state = 1;
          document.getElementById("state").innerHTML = "State: Rest(Taking Initial Heartrate Readings)";  
          currentStateDuration = 0;  
          document.getElementById("inputs").style.display = 'none';
          document.getElementById("msg").innerHTML = "Hold still as the sensor takes heart readings";

        }
      }

      /*
      shifting from initial rest to exercise after the duration exceeds threshold
      based on the collected data, we now display resting heart rate and target calories
      */
      if(state == 1 && currentStateDuration == restDuration){
        state = 2;
        document.getElementById("state").innerHTML = "State: Exercise";
        currentStateDuration = 0;
        restingHeartrate = totalHeartrate/restingMessages;
        document.getElementById("restinghr").innerHTML = "Resting Heartrate: " + restingHeartrate.toFixed(3);
        targetRate = (220 - age)*0.62;
        calorieGoal = ((age*0.2017) - (weight*0.09036) + (targetRate*0.6309) - 55.0969)*(setDuration*totalSets/251.04);
        document.getElementById("goal").innerHTML = "Calorie Target: " + calorieGoal.toFixed(3); 
        totalHeartrate = 0;
        restingMessages = 0;
        document.getElementById("msg").innerHTML = workouts[currentSets];

      }

      //shifting from exercise to rest after set duration is exceeded
      if(state == 2 && currentStateDuration == setDuration){
        state = 3;
        document.getElementById("state").innerHTML = "State: Rest";
        document.getElementById("msg").innerHTML = "Take a moment to catch your breath and hold still as the sensor takes heart readings";
        currentStateDuration = 0;
      }

      /*
      shifting from rest to exercise or end of workout
      calculates average active heartrate and calories burnt based on this reaading
      depending on how many sets are completed, this either shifts back to the exercise state
      or to the end state
      */
      if(state == 3 && currentStateDuration == restDuration){
        currentSets++;
        currentStateDuration = 0;
        activeHeartrate = totalHeartrate/restingMessages;
        document.getElementById("activehr").innerHTML = "Average Active Heartrate: " + activeHeartrate.toFixed(3);
        //calories burned =  [(age +  0.2017) — (weight + 0.09036) + (Heart Rate x 0.6309) — 55.0969] x Time / 4.184";
        calories = ((age*0.2017) - (weight*0.09036) + (activeHeartrate*0.6309) - 55.0969)*(activeMessages/25.104);
        document.getElementById("cals").innerHTML = "Calories Burnt: " + calories.toFixed(3);
        if(currentSets == totalSets){
          state = 4;
          document.getElementById("state").innerHTML = "State: Workout Complete";
          document.getElementById("msg").innerHTML = "Well done, you burned " + calories.toFixed(3) + " out of the " + calorieGoal.toFixed(3) + " calorie goal";
        }
        else{
          state = 2;
          document.getElementById("state").innerHTML = "State: Exercise";
          document.getElementById("msg").innerHTML = workouts[currentSets];
        }
      }
      
      
    } catch (err) {
      console.error(err);
    }
  };
});
