# Sample training management app

Sample application to view employee training status – who is trained, whose training is about to expire and what needs to be solved. Since training sessions have limited capacity, it also suggests which employees to register for which session, ordered by urgency.

The app is built with NestJS, Handlebars templates and MikroORM with SQLite. Source data are CSV files in the `data` directory, which are imported into the database on every start.

Live demo: [https://sample-training-management-app.onrender.com/](https://sample-training-management-app.onrender.com/)
