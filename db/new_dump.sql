<USER_REQUEST>
can you remove exiting data and populate them with these data "-- -------------------------------------------------------------
-- TablePlus 26.7.2(738)
--
-- https://tableplus.com/
--
-- Database: leave_system
-- Generation Time: 2026-07-10 13:08:21.7750
-- -------------------------------------------------------------


INSERT INTO "public"."leave_applications" ("id", "employee_id", "substitute_employee_id", "leave_type", "applied_date", "returning_date", "substitute_confirmed", "status", "created_at", "updated_at") VALUES
('70f8fb58-ed94-4676-a708-8d7f05960418', '95716b6d-cbac-4978-b59c-7d5b08aaba38', '2f9614c4-5965-4aed-be06-b1ccd9689596', 'casual', '2026-06-18', '2026-06-25', 't', 'approved', '2026-06-19 03:12:20.510076+05:30', '2026-06-19 03:15:57.220013+05:30'),
('8a8267d9-aa98-467b-9152-df1a066b16f3', '95716b6d-cbac-4978-b59c-7d5b08aaba38', '2f9614c4-5965-4aed-be06-b1ccd9689596', 'sick', '2026-06-18', '2026-06-24', 't', 'approved', '2026-06-19 03:12:02.87031+05:30', '2026-06-19 03:15:59.942631+05:30'),
('e355ec4e-56f1-4965-a371-c53a0fea559f', '95716b6d-cbac-4978-b59c-7d5b08aaba38', '2f9614c4-5965-4aed-be06-b1ccd9689596', 'annual', '2026-06-18', '2026-06-26', 't', 'approved', '2026-06-19 03:12:36.47989+05:30', '2026-06-19 03:15:54.825487+05:30'),
('ff02b1c8-b444-4ddd-9a09-2e77debc1ec8', '95716b6d-cbac-4978-b59c-7d5b08aaba38', '2f9614c4-5965-4aed-be06-b1ccd9689596', 'annual', '2026-06-18', '2026-06-23', 't', 'approved', '2026-06-19 03:11:42.898586+05:30', '2026-06-19 03:16:02.864041+05:30');

INSERT INTO "public"."leave_application_dates" ("id", "leave_application_id", "leave_date") VALUES
('429c715e-ade3-46eb-be66-b4ea04b3094e', 'ff02b1c8-b444-4ddd-9a09-2e77debc1ec8', '2026-05-22'),
('63b6c83f-41cd-49a3-903d-9003e5010cd4', '8a8267d9-aa98-467b-9152-df1a066b16f3', '2026-06-23'),
('c2cf1877-ee1f-4738-ae69-47d2f53caf21', 'e355ec4e-56f1-4965-a371-c53a0fea559f', '2026-06-25'),
('deb54f35-b9df-4edc-9abf-74f1bef43d6e', '70f8fb58-ed94-4676-a708-8d7f05960418', '2026-06-24');

INSERT INTO "public"."leav
<truncated 45215 bytes>
qPFTFwyxtmtTYg840Qo3F3mpQ1nGoCai3eroZrth0g0ovhpF0gAcl24uucXwtVo2ccZ91avFNvMs2WoN3qXEoSM9X/AJVcTm8YIg4F8VRpoUAcl2z3CxDUx0io7yFXZ9DcXmq/eOaIspU6fzVbXsxVQkerT4vNVrf620uNLr4W6g2t1MRsOk4l5r9VMuW4+sBc8gKw+x6Iam5t9PVByrOi215lBALqpbur1OVJcBrjU3h4VXY/Js6wk75vwq5k+0zRovEFbiagwO4HqFAeY1UFA5daaMOrKfEtW1wbRjFJy8LUJEkHNWFT21uvEQorD5i7NojVY193qBftc5DdyOuhXLTpXKrnCFbMpwn6aiuWtckkTSF7rrVwekmiKD3tXVBrOmOfVxGw1Zug3r3ve9X51htjllI473drLsNWVXOIE/u4hqPm8K1ZQGSYljq0974uriVno0yxjutqaosXjI4uE1PfNccEKNxd5qkjaziXLedXH/8AirYRBAy6V1cTNVi+q4l09xu0lt0k3MNQp8GXwyMtJgy+ORmqONUGlRpG01YHRNKrcJbu7biMOrgjdprBzmrg8QVuHtDWJ2On94o3N3l9Ww2y6Q62G5fqof02KudFaK5dSedYhqY7qt5xOurLc2qhAsKPpGnvVhC8DN7WZqJ0gknTUcquM1Oobcs6azjPONc/hpI1Tco0ipoRIpUjUGoYKP5jZeWre1WEZKNPm6g6x7Br9Ek6NuE+bw1e2XS5SIdLr3W81Q4kY+CdWU+alvI25SLV9iII6OM6i3Dw1YW3Qxge1uJuxC51porlsZdQINX1p0Lf0b1S0tzM4X2eKo0CAKBuXaNh2ySBOZ0iryRZZlGvUmn6qVJrXuBZEq3uhcq4y0nxL5awqTQZIjz1cNMurMEag1Qf/TT9H4JOwHWNZVlQHWO25tFn3EfN4qymsj/Mj/TUcsV0N+k+63eq5wyFAWzZQtYVaaiZCNy93qXV2sHOvtdxLvSPd73/AKK+3TRf4se73ajxOJvbpPvV9vi3DUvFS76GxttzAJVKnxVNEY2Knw+pKue4c6sLXoV/q3e6ims6Y7LifolLHw1FbtdfvJjpHhX3altFkk0w+HvN4atrowHopt2nutWH8c0rrwp+qr+1IImi5r3lqPF1y4gymreNrmUTMNKL3fe6w6uVZdqdhGYq5wzxxHS9N01wyQuNOnve9UcYQBQNIXbPKI0dj4asrYznppeLV3VrLKmUNuPKryzWB1OWqNvpqLD4RkQNitnsY9TE7TWupea/p9Swu01HpCNy9TLq4upKJkNytxVczl+jhTh1Kuqra1WFQB//AFV5ZiceU+FqsZ+hPQyDSV7rVJekyiNBq89G0jO8xqx81AADIdQernZp6mMHKMe81W4yjjy5aduLn9381WoyjX4V7A1iVr0bagNzeoQRGRgo8VRR6FCjkvY5A86k/dXQLcmobMTdZWEaDVJ5vLWGMInKONLt4m6gG3LOgPUyNp6t7b9NGR7fDWG3X3T8Lrw8Xl2MwUZmnY3koA/w1rLLsbqDpVIqRNJIPNe3wm10jWRvbu/DsAzoLlWWdEZda7tBOuXtXutS3M9twtHqC+KmuJ7ncqdGG7zVZ2Yg94t3mq5s1nyJ4SviXvUoyAGwD17LbeYeJeIHS6+KgbuPdlq/9/5V9mnn/wAQ6R5aggWIBVHWUZ1lRGe3F7XTlIB8XbWkHSuq+zxUi6QAPDsTa/aAeqSTKg4nVRUmMQr7dXwrTY8o5R0cdP8AL+r/APVft1v5a0uOn+X9VJjqnvKy1FiUT8n3+VqBBGY6mXZjadk0YkUqeTVLGUYqea9rhFvpUuebdRWotROfZgeqYliujNI+fiapJWfeTqPYW97JDyfd5fZVjiI
<truncated 84858 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.