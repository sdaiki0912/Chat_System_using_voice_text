# Overview
Current basic　chat application is only text to text or voice to voice(call).
Therefore, this peple can't talk parson who is want to talk in voice and parson who is need to talk in text because situation. For example, Parson want to talk in train.
So, I will propose new comunication tool. This is able to talk in text to voice, text to text and voice to voice(call).
<br>This code made by google gemini. Special Thanks to google.

# Communication process(Overview)
Basic idea is following 4things.<br>
 - Voice to Text(New communication): Voice -> voice recognition(Ex. Open AI whisper) -Network-> text <br>
 - Text to Voice(New communication): Text -Network-> Voice generation -> voice <br>
 - Text to Text(General communication): Text -Network-> Text<br>
 - Voice to Voice(General communication)(Not scope）: Voice -Network-> Voice<br>

## Voice to Text

## Text to Voice

## Text to Text

## Voice to Voice

# How to use
To run this chat application, you will need to use a simple local web server. This is necessary because modern web browsers have security policies that prevent direct communication between tabs when files are opened directly from your computer (i.e., using a file:/// URL).
You will need Python 3 installed on your system. Most macOS and Linux systems have it pre-installed.
<br>Follow these steps to get the application running: <br> 
1. Open your Terminal.<br>
2. On macOS, you can find it via Launchpad or Spotlight Search.
   On Windows, you can use Command Prompt or PowerShell.
   Navigate to the project directory. Use the cd (change directory) command to go to the folder where your project files are located.<br>
3. Start the local web server. Run the following command in your terminal. This will start a web server on port 8000.
```bash:title
cd /Users/daiki/Desktop/chatapp
```
4. You should see a message like Serving HTTP on :: port 8000 (http://0.0.0.0:8000/) .... Keep this terminal window open while you are using the application.
```bash
python3 -m http.server
```
5. Open the chat in your web browser.<br>
For User 1: Open a new browser tab and go to the following address: http://localhost:8000/user1.html<br>
For User 2: Open another browser tab and go to this address: http://localhost:8000/user2.html


# User Interface
This syetem shold be working on smart phone. However I am not fimilyer with application lanege of smart phonre.
So, Frist I will write HTML and Python. Then I will wirte application lanege of smart phonre.
