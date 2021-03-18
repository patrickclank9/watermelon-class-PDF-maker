# watermelon-class-PDF-maker
This project creates a selection of class schedule pdfs based on the input of a config.json file.
The sections that my partner and I coded are labled, my partner's is at the top of the file, mine is lower around line 755 as well as the contants at the begining.

To run the code -

In the project directory:
- Run 'npm install' to install all dependencies
- Run the project with 'node watermelon.js'

It will create 3 folders:
- All_Class_Schedules
- All_Prof_Schedules
- All_Tab_Schedules
All populated with different pdf schedules.

Class/Professor colors and Tab Schedules can be configured in config.json
If you want to change the classes to render, it is currently looking for a file 
called 'CS_Courses_2197_Schd_Dept_Stu_Views.json'
That must be changed in code if you want a different semester to be rendered.
