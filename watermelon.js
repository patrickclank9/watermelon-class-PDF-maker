//***************************************************************************************
//
// Constants
//
//***************************************************************************************

	const {moment_base, moment_round, moment_range} = {
		moment_base: require('moment'),
		moment_round: require('moment-round'),
		moment_range: require('moment-range')
	};
	const moment = moment_range.extendMoment(moment_base);
	const { readFileSync, createWriteStream }  = require('fs');
	const PdfPrinter  = require('pdfmake');
	const makeDir = require('make-dir');

	const fonts = {
		Roboto: {
			normal: 'fonts/Roboto-Regular.ttf',
			bold: 'fonts/Roboto-Medium.ttf',
			italics: 'fonts/Roboto-Italic.ttf',
			bolditalics: 'fonts/Roboto-MediumItalic.ttf'
		}
	};
	const fontSize = {header: 25, scheduleClassInfo: 9.5, arrClassInfo: 14, tableCatagory: 16};
	const bold = true;

	const printer = new PdfPrinter(fonts);
	//const flatCoursesArray = JSON.parse(readFileSync('./courses_flat_pp.json', 'utf8'));
	const nestedCoursesArray = JSON.parse(readFileSync('./CS_Courses_2197_Schd_Dept_Stu_Views.json', 'utf8'));
	const configObj = JSON.parse(readFileSync('./config.json', 'utf8'));


	const TimeCellHeight = 13;
	const DayCellHeight = 1;
	const DayCellWidth = 50;
	const PdfWidth = 1720;
	const DayTotalCellsVert = 56*3;

	const tableLayout = {
		hLineColor: function (i, node) {
			if(i === 0 || i === 1 || i === node.table.body.length){
				return 'black';
			} else if((i - 1) % 12 === 0){
				return '#CCCCCC';
			} else if((i - 1) % 3 === 0){
				return '#EEEEEE';
			} else {
				return '#EEEEEE';
			}
		},
		vLineColor: function (i, node) {
			return (i === 0 || i === node.table.widths.length) ? 'black' : '#FFFFFF';
		},
	}

	const exampleClass = {
		"parent_class_number" : 2747,
		"wtu" : 2,
		"units" : "3",
		"waitlist_size" : 0,
		"facility_name" : "IVES0101",
		"class_number" : 2747,
		"meeting_pattern" : "T",
		"end_time" : "12:50:00",
		"instructor_fName" : "Glenn",
		"req_room_capacity" : 24,
		"available_seats" : 0,
		"facility_cap" : 212,
		"ge_designation" : "GEB3",
		"start_time" : "11:00:00",
		"catalog" : "101",
		"instructor_lName" : "Carter",
		"instructor_id" : "000004745",
		"component" : "DIS",
		"section" : "001",
		"ftes" : 4.8,
		"enrol_capacity" : 24,
		"total_enrolled" : 24,
		"course_title" : "Intro Computers & Computing",
		"department" : "Computer Science",
		"combined_class_number" : 2747,
		"term" : "2187",
		"subject" : "CS"
	};

	// const TimeCellHeight = 13;
	// const DayCellHeight = 1;
	// const DayCellWidth = 80;
	// const DayTotalCellsVert = 56*3;


//***************************************************************************************
//
// Functions
//
//***************************************************************************************


	//##########################################
	//
	//	Color Setting Section (Gleb)
	//
	//##########################################

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function takes as input a className then checks if
		//		the config.json file has "course_colors: [ colors for courses ]"
		//		if so it will return the corresponding rgb hex color string of the class 
		//		otherwise it'll return the rgb hex string for the color white
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function getColorForClass(className)
		{
			if (configObj.hasOwnProperty("course_colors"))
			{
				if (configObj["course_colors"].hasOwnProperty(className))
					return configObj["course_colors"][className];
			}

			return '#ffffff';
		}


		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function takes as input an rgb hex color string value, validates it and
		//		returns an rgb hex color string value thats 10% lighter
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function lighterShadeForLab(hex) 
		{
			// validate hex string
			hex = String(hex).replace(/[^0-9a-f]/gi, '');
			if (hex.length < 6) 
				hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
			
			lum = 0.1;	// 10% lighter

			// convert to decimal and change luminosity
			var rgb = "#", c, i;
			for (i = 0; i < 3; i++) 
			{
				c = parseInt(hex.substr(i*2,2), 16);
				c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
				rgb += ("00"+c).substr(c.length);
			}

			return rgb;
		}


		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function takes as input a profFullName then checks if
		//		the config.json file has "instructors: { color for profs }"
		//		if so it will return the corresponding rgb hex color string 
		//		to use for the profs classes otherwise it'll return the rgb hex string 
		//		for the color white
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function getColorForProf(profFullName)
		{
			if (configObj.hasOwnProperty("instructors"))
			{
				if (configObj["instructors"].hasOwnProperty(profFullName))
				{
					if (configObj["instructors"][profFullName].hasOwnProperty("color"))
						return configObj["instructors"][profFullName]["color"];
				}
			}

			return '#ffffff';
		}


		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function takes as input a profFullName then checks if
		//		the config.json file has "instructors: { name for profs }"
		//		if so it will return the corresponding name string for the prof 
		//		otherwise it'll return the profs last name
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function getAbbreviatedNameForProf(profFullName)
		{
			if (configObj.hasOwnProperty("instructors"))
			{
				if (configObj["instructors"].hasOwnProperty(profFullName))
				{
					if (configObj["instructors"][profFullName].hasOwnProperty("name"))
						return configObj["instructors"][profFullName]["name"];
				}
			}

			// console.log(profFullName.substr(profFullName.indexOf(' ') + 1) );
			return profFullName.substr(profFullName.indexOf(' ') + 1);
		}



	//##########################################
	//
	//	Flatten JSON File Section (Gleb)
	//
	//##########################################

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This is a helper function for flattenArray()
		//		checks to see if the passed in obj is already
		//		in the finalFlatArray if so exlude it
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function isDupe(tempObj, finalFlatArray)
		{
			if(finalFlatArray.length === 0)
				return false;
				
			for(let classObj of finalFlatArray)
			{
				if(classObj.instructor_lName === tempObj.instructor_lName &&
					classObj.catalog === tempObj.catalog &&
					classObj.start_time === tempObj.start_time &&
					classObj.facility_name === tempObj.facility_name &&
					classObj.meeting_pattern === tempObj.meeting_pattern){
					return true;
				}
			}

			return false;
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function flattens an array of nested obj's and excludes duplicates
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function flattenArray()
		{
			let nestedArray = {...nestedCoursesArray};
			let finalFlatArray = [];
			let tempObj = {};
			
			let componentValue;
			let temp;
			let temp_instructors;
			let temp_meeting_pattern;
			

			let schedulerView = nestedArray["schedulerView"];	// { schedulerView : {} }
			
			for (let x in schedulerView)	// { schedulerView : { CS-115 : {} } }
			{
				let theClass = schedulerView[x];
				let classColor = getColorForClass( x.replace(/-/g, " ") );

				for (let classProp in theClass)	// { schedulerView : { CS-115 : { CS-115 2197 1287 : [] } } }
				{
					if (classProp === "isMultiComponent")
						continue;

					let classSection = theClass[classProp];
					for (let classInfoObj of classSection)	//	go through each classInfoObj in the classSection array [ {} , {}, {} ]
					{
						classInfoObj["color"] = classColor;
						if (classInfoObj.hasOwnProperty("components"))
						{							
							// for every component found in the components array find that component in the classInfoObj and flatten it 
							// (Note: the actual components array as well as the individual component arrays will be removed later)
							for (let x = 0; x < classInfoObj["components"].length; x++)	
							{
								componentValue = classInfoObj["components"][x];

								if (classInfoObj.hasOwnProperty(componentValue))
								{
									temp = {...classInfoObj[componentValue]};

									if (temp.hasOwnProperty("instructors"))
									{
										temp_instructors = temp["instructors"].slice(0);
										delete temp["instructors"];
									}

									if (temp.hasOwnProperty("meeting_pattern"))
									{
										temp_meeting_pattern = temp["meeting_pattern"].slice(0);
										delete temp["meeting_pattern"];
									}
								}

								// create obj that has all the info in flat json format 
								// so at this point 
								// classInfoObj -> is the original nested array, 
								// temp -> is an individual component array (Ex: "DIS" is a component that has an obj as its value therefore temp now stores a copy of that entire component's obj but without the "instructors" and "meeting_pattern" keys thus its flattened)
								// temp_instructors -> is an array of objs (Ex: the "instructors" key has an array of obj's as its value thus temp_instructors now stores a copy of that array)
								// temp_meeting_pattern -> is also an array of objs (Ex: the "meeting_pattern" key has an array of obj's as its value thus temp_meeting_pattern now stores a copy of that array)
								
								// (Note: the actual "components array" ("components": []) and the individual component keys and values (Ex: "DIS:[]", "LAB:[]", etc.) are still present and will be removed later)

								tempObj = {...classInfoObj, ...temp, ...temp_instructors[0], ...temp_meeting_pattern[0]};
								tempObj["isMultiComponent"] = theClass["isMultiComponent"];

								if (!isDupe(tempObj, finalFlatArray))	// if no dup's then add to the array
									finalFlatArray.push(tempObj);

								tempObj = {};	// clear 
							}
						}
					}
				}
			}
			

			// now go through each obj in the finalFlatArray and remove the actual "componets array" ("components": []) as well as each of the individual component keys and values (Ex: "DIS:[]", "LAB:[]", etc.)
			for (let finalObj of finalFlatArray)	
			{
				if (finalObj.hasOwnProperty("components"))
				{
					for (let x = 0; x < finalObj["components"].length; x++)
					{
						componentValue = finalObj["components"][x];

						for (let prop in finalObj)
						{
							if (prop == componentValue)
								delete finalObj[prop];
						}
					}
				}
				delete finalObj["components"];

				if (finalObj.hasOwnProperty("component"))
				{
					if (finalObj["component"] === "LAB")
					{
						let curColor = finalObj["color"];
						finalObj["color"] = lighterShadeForLab(curColor);
					}
				}


				if (finalObj.hasOwnProperty("instructor_fName") && finalObj.hasOwnProperty("instructor_lName"))
				{
					let profFullName = finalObj["instructor_fName"] + " " + finalObj["instructor_lName"];
					finalObj["abbreviated_name"] = getAbbreviatedNameForProf(profFullName);
				}
			}

			//console.log(finalFlatArray)
			return finalFlatArray;	// end result is an array of flat json objects
		}


	//############################################
	//
	//	Create All Prof Schedules Section (Gleb)
	//
	//############################################

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function will create a Dir that will store all the generated
		//		prof schedule pdfs
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function createAllProfSchedulesDir()
		{
			(async () => {
			    const path = await makeDir('All_Prof_Schedules');
			    console.log(path);
			})();
		}


		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function will create an obj with { instructor_id value : [], instructor_id value : [] }
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function createAllProfSchedulesObj(schedule)
		{

			let copySchedule = schedule.slice(0);

			let tempArray = [];
			let allArray = [];	// is an array that stores all the class objs
			let tempKey;
			let tempObj;

			let finalObj = new Object();

			while(copySchedule.length > 0)
			{
				//console.log(temp_Key);
				for (let key in copySchedule[0]){	// this loop goes through the properties of the first array in array and gets its key
					if (key == 'instructor_id')
					 	tempKey = (copySchedule[0])[key];
				}

				// now this loop uses this key to find all the other objs that have this key
				// removes those objs from array and adds them to tempArray
				for (let x = 0; x < copySchedule.length; x++) 	// will go through all the individual objs
				{
					tempObj = copySchedule[x];	// for readability sake copySchedule holds all the objs tempObj holds a single one

					if (tempObj.hasOwnProperty("instructor_id"))	// check if the obj has an instructor_id prop 
					{
						if (tempObj["instructor_id"] == tempKey)	// if the objs 'instructor_id' matches the temp_Key push the obj into tempArray and remove it from copySchedule
						{
							if (tempObj.hasOwnProperty("instructor_fName") && tempObj.hasOwnProperty("instructor_lName"))
							{
								let profFullName = tempObj["instructor_fName"] + " " + tempObj["instructor_lName"];
								tempObj["color"] = getColorForProf(profFullName);

								if (tempObj.hasOwnProperty("component"))
								{
									if (tempObj["component"] === "LAB")
									{
										let curColor = tempObj["color"];
										tempObj["color"] = lighterShadeForLab(curColor);
									}
								}
							}

							tempArray.push(copySchedule[copySchedule.indexOf(tempObj)])
							copySchedule.splice(copySchedule.indexOf(tempObj),1)
							x--;
						}
					}
				}

				finalObj[tempKey] = tempArray;	// {instructor_id # : []}

				for (let x of tempArray)
					allArray.push(x);

				tempArray = [];	// clear
			}

			finalObj["all_profs"] = allArray;
			return finalObj;	// the finalObj containts all the instructor_id's as the key and an array of obj's of all their classes as the values  {instructor_id # : [ {}, {}, {} ], ... }
		}


		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function calls flattenArray(), createAllProfSchedulesDir(), createAllProfSchedulesObj()
		//		 and createPdf() therby creating the Dir where all the pdfs will be stored,
		//		flatten the array, create an obj with { instructor_id value : [], instructor_id value : [] },
		//		and finally create a pdf for every prof's schedule.
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function createDirAndProfPdfs()
		{
			createAllProfSchedulesDir();

			let flatArray = flattenArray();
			//console.log(flatArray);

			let profObj = createAllProfSchedulesObj(flatArray);
			//console.log(profObj);

			let valueArray;
			let file_name;
			

			for (let prop in profObj)
			{
				if (prop == "all_profs")
					continue;

				valueArray = profObj[prop];

				if (valueArray[0].hasOwnProperty("abbreviated_name"))
					file_name = (valueArray[0])["abbreviated_name"];

				else if (valueArray[0].hasOwnProperty("instructor_lName"))
					file_name = (valueArray[0])["instructor_lName"];

				file_name = file_name.replace(/ /g,"_");
				console.log(file_name);
				createPdf(valueArray, file_name, "./All_Prof_Schedules/");
				
			}

			if (profObj.hasOwnProperty("all_profs"))
			{
				createPdf(profObj["all_profs"], "All_Profs_Single_Page", "./All_Prof_Schedules/");
				createPdf(profObj["all_profs"], "All_Profs_Multi_Page", "./All_Prof_Schedules/", "Multi_Pg_For_Profs", profObj);
			}
		}


	//############################################
	//
	//	Create All Class Schedules Section (Gleb)
	//
	//############################################

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function will create a Dir that will store all the individually generated
		//		 class schedule pdfs (Gleb)
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function createAllClassSchedulesDir()
		{
			(async () => {
			    const path = await makeDir('All_Class_Schedules');
			    console.log(path);
			})();
		}


		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function will create an obj where the key is the class name and value
		//	is an array of all those classes Ex: { CS-115 : [all cs-115 classes], ect. }
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function createAllClassSchedulesObj(schedule)
		{
			let copySchedule = schedule.slice(0);

			let tempArray = [];
			let allArray = [];	// is an array that stores all the class objs
			let tempKey;
			let tempObj;

			let finalObj = new Object();

			while(copySchedule.length > 0)
			{

				if (copySchedule[0].hasOwnProperty('subject') && copySchedule[0].hasOwnProperty('catalog'))
				{
					if (copySchedule[0]['subject'] === 'CS')
						tempKey = (copySchedule[0])['catalog'];

				}

				// now this loop uses this key to find all the other objs that have this key
				// removes those objs from array and adds them to tempArray
				for (let x = 0; x < copySchedule.length; x++) 	// will go through all the individual objs
				{
					tempObj = copySchedule[x];	// for readability sake copySchedule holds all the objs tempObj holds a single one

					if (tempObj.hasOwnProperty('subject') && tempObj.hasOwnProperty('catalog'))	// check if the obj has a subject and catalog prop 
					{
						if ( tempObj['subject'] === 'CS' && tempObj['catalog'] === tempKey)	// if the objs 'subject' and 'catalog' matches the temp_Key push the obj into tempArray and remove it from copySchedule
						{
							tempArray.push(copySchedule[copySchedule.indexOf(tempObj)])
							copySchedule.splice(copySchedule.indexOf(tempObj),1)
							x--;
						}
					}
				}

				finalObj['CS-'+tempKey] = tempArray;	// {instructor_id # : []}

				tempArray = [];	// clear
			}

			for (let x of schedule)
				allArray.push(x);

			finalObj["all_classes"] = allArray;
			return finalObj;
		}


		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function calls flattenArray(), createAllClassSchedulesDir(), createAllClassSchedulesObj()
		// 		and createPdf() therby creating the Dir where all the pdfs will be stored,
		//		flatten the array, create an obj with { className : [all classes with className], ect. },
		//		and finally create a pdf for every class schedule.
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function createDirAndClassPdfs()
		{
			createAllClassSchedulesDir();

			let flatArray = flattenArray();
			//console.log(flatArray);

			let classObj = createAllClassSchedulesObj(flatArray);
			//console.log(classObj);

			let valueArray;
			let file_name;
			

			for (let prop in classObj)
			{
				if (prop == "all_classes")
					continue;

				file_name = prop;
				valueArray = classObj[prop];

				createPdf(valueArray, file_name, "./All_Class_Schedules/");	
			}

			if (classObj.hasOwnProperty("all_classes"))
			{
				createPdf(classObj["all_classes"], "All_Classes_Single_Page", "./All_Class_Schedules/");
				createPdf(classObj["all_classes"], "All_Classes_Multi_Page", "./All_Class_Schedules/", "Multi_Pg_For_Classes", classObj);
			}
		}


	//############################################
	//
	//	Create All Classes In Labs Section (Gleb)
	//
	//############################################


		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function will create an Obj whose keys are the 4 Labs with 
		//		the values being an array of all the classes that are in the Lab (Gleb)
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function createAllClassesInLabsObj(schedule)
		{
			let copySchedule = schedule.slice(0);

			let tempArray = [];
			let labNamesArray = ['DARW0025', 'DARW0028', 'DARW0029', 'STEV1034'];
			let idx = 0;

			let allArray = [];	// is an array that stores all the class objs
			let tempKey;
			let tempObj;

			let finalObj = new Object();


			for (let labName of labNamesArray)
			{
				for (let obj of copySchedule)
				{
					if (obj.hasOwnProperty('facility_name'))
					{
						if (obj['facility_name'] === labName)
						{
							tempKey = obj['facility_name'];
							tempArray.push(obj);
							allArray.push(obj);
						}
					}
				}

				finalObj[tempKey] = tempArray;
				tempArray = [];
			}

			finalObj["all_classes_in_all_labs"] = allArray;
			return finalObj;

		}


		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function calls flattenArray(), createAllClassesInLabsObj()
		// 		and createPdf() thus flatten the array, create an obj with 
		//		{ labName : [all classes in labName], ect. }
		//		and finally create a pdf for every class in the 4 labs schedule.
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function createAllClassesInLabsPdf()
		{
			let flatArray = flattenArray();
			//console.log(flatArray);

			let labsObj = createAllClassesInLabsObj(flatArray);
			//console.log(labsObj);


		}


		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function will call functions from the --- Make PDF Section ---
		//		to create single and multi page PDF's (Gleb)
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function createPdf(scheduleArr, pdfName, dirPath, singleOrMultiPg = "Single_Pg", profOrClassObj)
		{
			if (singleOrMultiPg === "Single_Pg")
			{
				let defDoc = makePdfDocDefinition(scheduleArr, "All Professors Schedule")
				printPdf(defDoc, pdfName, dirPath);
			}
			else if (singleOrMultiPg === "Multi_Pg_For_Profs")
			{
				let allDd = makePdfDocDefinition(scheduleArr, "All Professors Schedule");
				let valueArray = [];
				let prof_name;

				for (let prop in profOrClassObj)
				{
					if (prop === "all_profs")
						continue;

					valueArray = profOrClassObj[prop];

					let dd = makePdfDocDefinition(valueArray, valueArray[0].abbreviated_name + " Schedule");

					// to expand a docDefinitions: 
					allDd.content.push({text: '', pageBreak: 'after'}); // This is how you can add a break between pages
					allDd.content.push(dd.content[0]); 
					allDd.content.push(dd.content[1]);
					allDd.content.push(dd.content[2]);
				}

				printPdf(allDd, "All_Profs_Multi_Page", "./All_Prof_Schedules/");
			}
			else if (singleOrMultiPg === "Multi_Pg_For_Classes")
			{
				let allDd = makePdfDocDefinition(scheduleArr, "All Classes Schedule");
				let valueArray = [];
				let file_name;

				for (let prop in profOrClassObj)
				{
					if (prop === "all_classes")
						continue;

					valueArray = profOrClassObj[prop];

					let dd = makePdfDocDefinition(valueArray, valueArray[0].subject + " " + valueArray[0].catalog + " Schedule");

					// to expand a docDefinitions: 
					allDd.content.push({text: '', pageBreak: 'after'}); // This is how you can add a break between pages
					allDd.content.push(dd.content[0]); 
					allDd.content.push(dd.content[1]);
					allDd.content.push(dd.content[2]); 
				}


				printPdf(allDd, "All_Classes_Multi_Page", "./All_Class_Schedules/");
			}	
		}


	//############################################
	//
	//	Create PDF's Based on Tabs Section (Patrick)
	//
	//############################################

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//
		//	This function will create a Dir that will store all the generated
		//		pdfs based of the "tabs : []"
		//
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		function createTabsEntriesDir() {
			(async () => {
			    const path = await makeDir('Tabs_Entries');
			    console.log(path);
			})();
		}



		function makeCatagorizedDataObj(scheduleArr, attribute) {
			dataObj = {};
			scheduleArr.forEach( (classObj) => {
				let attributeData = classObj[attribute];
				if(!Array.isArray(dataObj[attributeData])){
					dataObj[attributeData] = [];
				}
				dataObj[attributeData].push(classObj);
			});
			return dataObj;
		}

		function generateCoursePdfs(catalogsObj, config){
			function getCatalogsList(catalogsObj, except=[]){
				let catalogsList = [];
				for(let catalogName in catalogsObj)
					catalogsList.push(catalogName);

				except.forEach( (entry)=> {
					let subject = entry.match(/[A-Z]*/)[0];
					let catalog = entry.match(/[0-9][0-9A-Z]{2,}/)[0];
					let idx = catalogsList.indexOf(catalog);
					if(idx === -1) return;
					catalogsList.splice(idx, 1);
				});
				return catalogsList;
			}
		
			(async () => {
				const path = await makeDir('All_Tab_Schedules'); 
			})();
		
			let rest = getCatalogsList(catalogsObj);
		
			let {tabs} = config;
		
			for(let tabObj of tabs){
				//console.log('processing: ', tabObj);
				let scheduleArr = [];
				let {name, entries, title} = tabObj;
				if(!Array.isArray(entries) || entries.length === 0){
					console.warn("config.json tab entries is not an array or is empty: ", entries);
					continue;
				}
				if(entries[0] === 'rest'){
					entries = [...rest];
				} else if(entries[0] === 'all'){
					entries = getCatalogsList(catalogsObj);
				} else if(entries[0] === 'all except'){
					let except = entries.slice(1);
					entries = getCatalogsList(catalogsObj, except);
				} 

				entries.forEach( (courseCatalog) => {
					let subject = courseCatalog.match(/[A-Z]*/)[0];
					let catalog = courseCatalog.match(/[0-9][0-9A-Z]{2,}/)[0];
					let idx = rest.indexOf(catalog);
					if(idx !== -1) rest.splice(idx, 1);
					scheduleArr = [...scheduleArr, ...catalogsObj[catalog]];
				});
				
				console.log(`Making ${name}.pdf`);
				let dd = makePdfDocDefinition(scheduleArr, title);
				printPdf(dd, name, './All_Tab_Schedules/');
			}
		}


	//######################################
	//
	//	Make PDF Section (Patrick)
	//
	//######################################


		function makeScheduleObject(scheduleArr) {
			// returns an object of each day (Mon - Fri).
			// each day is a 2d array corresponding to the column the class block will be placed in:
			// [class element number][column to be placed in]
			const initDay = () => [ [] ];
			const overlap = (timeRangesList, timeRange) => {
				// timeRangesList is in the form: [{from:start_time_string, to:end_time_string} ...]
				// timeRange is in the form: {from:start_time_string, to:end_time_string}
				// this function returns true if timeRange overlaps with any of time ranges in timeRangesList
				if(!Array.isArray(timeRangesList) || timeRangesList.length === 0)
					return false;
				let range1 = moment.range( moment(timeRange.from, "HH:mm:ss"), moment(timeRange.to, "HH:mm:ss") );
				for(let otherTimeRange of timeRangesList){
					let range2 = moment.range( moment(otherTimeRange.from, "HH:mm:ss"), moment(otherTimeRange.to, "HH:mm:ss") );
					if(range1.overlaps(range2))
						return true;
				}
				return false;
			}	

			const makeMeetingPatternArr = (meetingPatternStr) => {
			// console.log("meetingPatternStr: ", meetingPatternStr);
			const abbreviationToFull = { M: "Monday", T: "Tuesday", W: "Wednesday", TH: "Thursday", F: "Friday"};
			let meetingPatternAbbrArr = meetingPatternStr.match(/TH|T|M|W|F/g);
			if(meetingPatternAbbrArr === null){
				if(meetingPatternStr.match(/ARR/g) !== null)
					return 0;
				meetingPatternAbbrArr = [];
			}
			// console.log("meetingPatternAbbrArr: ", meetingPatternAbbrArr);
			let meetingPatternArr = meetingPatternAbbrArr.reduce( (acc, current) => {
				acc.push(abbreviationToFull[current]);
				return acc;
			}, []);
			// console.log("meetingPatternArr: ", meetingPatternArr);
			return meetingPatternArr;
			}

			let scheduleObj = {Monday: initDay(), Tuesday: initDay(), Wednesday: initDay(), Thursday: initDay(), Friday: initDay()};
			let arrClassesList = [];
			
			for(let classObj of scheduleArr){
				// console.log("Class Object:", classObj);
				let meeting_pattern = makeMeetingPatternArr(classObj.meeting_pattern);
				if(Number.isInteger(meeting_pattern)){
					arrClassesList.push(classObj);
					meeting_pattern = [];
				}
				// console.log("meeting_pattern: ", meeting_pattern);
				// console.log("scheduleObj: ", scheduleObj);
				meeting_pattern.forEach(day => {
					let column = 0;
					let dayInSchedule = scheduleObj[day];
					while(column <= 20) { //update column to correct column
						// console.log("column: ", column);
						while(!dayInSchedule[column])
							dayInSchedule.push([]);
						let currentTimeRanges = dayInSchedule[column].reduce( 
							(acc, current) => {
								acc.push({from: current.start_time, to: current.end_time})
								return acc;
							},
						[]);
						let timeRangeToTest = {from: classObj.start_time, to: classObj.end_time};
						if(overlap(currentTimeRanges, timeRangeToTest)){
							column++;
						} else break;
					}
					dayInSchedule[column].push(classObj);
					// console.log(`${letterToDay[dayLetter]}:`, dayInSchedule);
				});
			}

			return {scheduleObj, arrClassesList};
		}

		function populateTableWithSchedule(scheduleObj, daysAndTimes) {
			let {tableDays, times} = daysAndTimes;

			function addClass(classObj, day, column, classBoxColor){

				function makeClassBlock(text, rowSpan, fillColor){
					return { text: String(text), rowSpan, fillColor, alignment: 'center', fontSize: fontSize.scheduleClassInfo, bold };
				}

				function formatFacilityName(facility_name){
					let building = facility_name.match(/[A-Z]*/)[0];
					building = building.charAt(0) + building.substr(1).toLowerCase();
					let roomNum = facility_name.match(/[1-9][0-9]{0,}/);
					return `${building} ${roomNum}`;
				}

				let start_time = moment(classObj.start_time, "HH:mm:ss").floor(5, 'minutes');
				let end_time = moment(classObj.end_time, "HH:mm:ss").floor(5, 'minutes');
				let classBoxText = [
					classObj.subject + ' ' + classObj.catalog,
					classObj.component + ' ' + classObj.section,
					formatFacilityName(classObj.facility_name),
					classObj.instructor_lName
				].reduce((acc, current) => acc + "\n" + current, "");
				let timeFormattedArr = times.reduce((acc, current) => acc.concat(current.format("hh:mm a")), []);
				let dayCellIndex = timeFormattedArr.indexOf(start_time.format("hh:mm a")) + 1;
				let cellHeight = Math.floor((moment.duration(end_time.diff(start_time)).asMinutes())/5);
				while(!Array.isArray(day[dayCellIndex]) || day[dayCellIndex].length <= column){
					day.forEach((row) => row.push([]));
					day[0][0].colSpan++;
				}
				day[dayCellIndex][column] = makeClassBlock(classBoxText, cellHeight, classBoxColor);
			}

			for(let scheduleDay in scheduleObj){
				let columnList = scheduleObj[scheduleDay];
				for(let col = 0; col < columnList.length; col++){
					classesList = columnList[col];
					for(let classIdx = 0; classIdx < classesList.length; classIdx++){
						let classObj = classesList[classIdx];
						let classBoxColor = classObj.hasOwnProperty("color") ? classObj.color : "#DDDDDD"; 
						addClass(classObj, tableDays[scheduleDay], col, classBoxColor);
					}
				}
			}
		}

		function makePdfDocDefinition(scheduleArr, title="") {
			//functions

			function getTimesArray(starttimeStr, endtimeStr){
				let starttime = moment(starttimeStr, "hh:mm a");
				let endtime = moment(endtimeStr, "hh:mm a");
				let arr = [];
				let currenttime = moment(starttime);
				while(currenttime <= endtime){
					arr.push(moment(currenttime));
					currenttime.add(5, 'minutes');
				}
				return arr;
			}
			
			function makeDayBody(dayName, columns=1){
				let body;
				let first = Array(columns).fill('');
				first[0] = {text: dayName, colSpan: columns, alignment: 'center', fontSize: fontSize.tableCatagory};
				body = [first];
				for(let i = 0; i < DayTotalCellsVert; i++){
					body.push(Array(columns).fill(''));
				}
				return body;
			}
			
			function makeBodyTable(body){
				return {
					style: 'tableExample',
					table: {
						widths: Array(body[0].length).fill(DayCellWidth),
						heights: (row) => row === 0 ? TimeCellHeight : DayCellHeight,
						body: body
					},
					layout: tableLayout
				};
			}
			
			function makeTimesTable(timesArr){
				let body = [];
				body.push([{text:'Times', alignment: 'center', fontSize: fontSize.tableCatagory}]);
				timesArr.forEach((time, idx) => {
					if(idx % 3 === 0) 
						body.push([time.format("hh:mm a")]);
				});
				return {
					style: 'tableExample',
					table: {
						widths: '*',
						heights: TimeCellHeight,
						body: body
					},
					layout: {
						hLineColor: function (i, node) {
							return (i === 0 || i === 1 || i === node.table.body.length) ? 'black' : '#BBBBBB';
						},
						fillColor: function (rowIndex) {
							return ((rowIndex + 1) % 2 === 0) ? '#DDDDDD' : null;
						}
					}
				};
			}

			function makeArrClassesList(arrClassesList){
				let list = [];
				arrClassesList.forEach((classObj) => {
					let text = `${classObj.subject} ${classObj.catalog}\nSection ${classObj.section}: `;
					text += `${classObj.course_title}\nWith `;
					text += `${classObj.instructor_lName}, ${classObj.instructor_fName}\n `;
					list.push({text, fontSize: fontSize.arrClassInfo});
				});
				return list;
			}

			//code

			let daysAndTimes = {
				tableDays: {
					Monday: makeDayBody("Mon"),
					Tuesday: makeDayBody("Tues"),
					Wednesday: makeDayBody("Wed"),
					Thursday: makeDayBody("Thur"),
					Friday: makeDayBody("Fri")
				}, 
				times: getTimesArray("08:00 am", "09:45 pm")
			};
			let {tableDays, times} = daysAndTimes;
			let {scheduleObj, arrClassesList} = makeScheduleObject(scheduleArr);
			//console.log(arrClassesList);
			//console.log("scheduleObj: ", scheduleObj);
			
			populateTableWithSchedule(scheduleObj, daysAndTimes);

			return {
				content: [
					{text: title, fontSize: fontSize.header, alignment: 'center'},
					{
						layout: 'noBorders',
						table: {
							widths: 'auto',
							body: [[
								makeTimesTable(times, TimeCellHeight),
								makeBodyTable(tableDays.Monday, DayCellHeight),
								makeBodyTable(tableDays.Tuesday, DayCellHeight),
								makeTimesTable(times, TimeCellHeight),
								makeBodyTable(tableDays.Wednesday, DayCellHeight),
								makeBodyTable(tableDays.Thursday, DayCellHeight),
								makeTimesTable(times, TimeCellHeight),
								makeBodyTable(tableDays.Friday, DayCellHeight)
							]]
						}
					},
					{
						pageBreak: 'before',
						layout: 'noBorders',
						table: {
							widths: 'auto',
							body: [
								[{text: title + ' (By Arrangement)', fontSize: fontSize.header}],
								[{ul: makeArrClassesList(arrClassesList)}]
							]
						}
					}
				],
				styles: {
					tableExample: {
						margin: [0, 0, 0, 0]
					}
				},
				defaultStyle: {
					fontSize: 10
				},
				pageSize: {
					width: PdfWidth,
					height: 1200
				}
			};
		}

		function printPdf(docDefinition, pdfName, directoryPath='./') {
			let pdfDoc = printer.createPdfKitDocument(docDefinition)
			pdfDoc.pipe(createWriteStream(`${directoryPath}${pdfName}.pdf`));
			pdfDoc.end();
		}


//***************************************************************************************
//
// Main
//
//***************************************************************************************


	let catalogsObj = makeCatagorizedDataObj(flattenArray(), "catalog");
	generateCoursePdfs(catalogsObj, configObj);

	createDirAndProfPdfs();
	createDirAndClassPdfs();
