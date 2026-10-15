# 02_application: casos de uso, contratos y DTO

## Propósito

src/core/application contiene la lógica que orquesta las reglas del sistema.
No importa Express, MQTT concreto ni PostgreSQL: recibe dependencias mediante
puertos y permite probar el comportamiento con dobles de prueba.

El flujo esperado es Controlador -> DTO -> Caso de uso -> Puerto -> Adaptador.

## Subcarpetas

- dtos: adapta y valida la forma de entrada o salida sin exponer detalles
  internos.
- ports: contratos que la aplicación necesita de repositorios, seguridad,
  notificaciones y MQTT.
- services: reglas transversales que reúnen varios casos de uso.
- use-cases: operaciones de negocio agrupadas por dominio.
- validation: validaciones compartidas.

## Archivos por carpeta

### DTO de petición

- **AddHomeMemberRequest.js:** normaliza y valida el payload de Add Home Member Request.
- **AnswerHomeMembershipRequest.js:** normaliza y valida el payload de Answer Home Membership Request.
- **ChangeHomeMemberRoleRequest.js:** normaliza y valida el payload de Change Home Member Role Request.
- **ChangePasswordRequest.js:** normaliza y valida el payload de Change Password Request.
- **ConsumptionSeriesRequest.js:** normaliza y valida el payload de Consumption Series Request.
- **ConsumptionSummaryRequest.js:** normaliza y valida el payload de Consumption Summary Request.
- **CreateHomeRequest.js:** normaliza y valida el payload de Create Home Request.
- **DailyConsumptionRequest.js:** normaliza y valida el payload de Daily Consumption Request.
- **DeactivateDeviceRequest.js:** normaliza y valida el payload de Deactivate Device Request.
- **HourlyConsumptionRequest.js:** normaliza y valida el payload de Hourly Consumption Request.
- **LoginRequest.js:** normaliza y valida el payload de Login Request.
- **MonthlyConsumptionRequest.js:** normaliza y valida el payload de Monthly Consumption Request.
- **RegisterDeviceRequest.js:** normaliza y valida el payload de Register Device Request.
- **RegisterUserRequest.js:** normaliza y valida el payload de Register User Request.
- **RequestPasswordResetRequest.js:** normaliza y valida el payload de Request Password Reset Request.
- **ResetPasswordRequest.js:** normaliza y valida el payload de Reset Password Request.
- **UpdateCurrentUserRequest.js:** normaliza y valida el payload de Update Current User Request.
- **UpdateDeviceConfigRequest.js:** normaliza y valida el payload de Update Device Config Request.
- **UpdateDeviceProvisioningRequest.js:** normaliza y valida el payload de Update Device Provisioning Request.
- **UpdateDeviceRequest.js:** normaliza y valida el payload de Update Device Request.
- **UpdateDeviceStatusRequest.js:** normaliza y valida el payload de Update Device Status Request.
- **UpdateHomeRequest.js:** normaliza y valida el payload de Update Home Request.
- **UpdateNotificationPreferencesRequest.js:** normaliza y valida el payload de Update Notification Preferences Request.
- **UpdateUserPreferencesRequest.js:** normaliza y valida el payload de Update User Preferences Request.

### DTO de respuesta

- **AuthResponse.js:** formatea la respuesta de Auth Response.
- **ConsumptionSummaryResponse.js:** formatea la respuesta de Consumption Summary Response.
- **DeviceResponse.js:** formatea la respuesta de Device Response.
- **HomeMemberResponse.js:** formatea la respuesta de Home Member Response.
- **HomeMembershipRequestResponse.js:** formatea la respuesta de Home Membership Request Response.
- **HomeResponse.js:** formatea la respuesta de Home Response.
- **UserResponse.js:** formatea la respuesta de User Response.

### Puertos

- **NotificationSender.js:** define el puerto de envío de notificaciones.
- **ActuatorRepository.js:** define el contrato de repositorio para Actuator Repository.
- **AlertRepository.js:** define el contrato de repositorio para Alert Repository.
- **AuditRepository.js:** define el contrato de repositorio para Audit Repository.
- **AuthRepository.js:** define el contrato de repositorio para Auth Repository.
- **DeviceRepository.js:** define el contrato de repositorio para Device Repository.
- **GoalRepository.js:** define el contrato de repositorio para Goal Repository.
- **HomeRepository.js:** define el contrato de repositorio para Home Repository.
- **PrivacyRepository.js:** define el contrato de repositorio para Privacy Repository.
- **RecommendationRepository.js:** define el contrato de repositorio para Recommendation Repository.
- **ReportRepository.js:** define el contrato de repositorio para Report Repository.
- **RoleRepository.js:** define el contrato de repositorio para Role Repository.
- **TariffRepository.js:** define el contrato de repositorio para Tariff Repository.
- **TelemetryRepository.js:** define el contrato de repositorio para Telemetry Repository.
- **TicketRepository.js:** define el contrato de repositorio para Ticket Repository.
- **UserRepository.js:** define el contrato de repositorio para User Repository.
- **VacationRepository.js:** define el contrato de repositorio para Vacation Repository.
- **PermissionChecker.js:** define el contrato para comprobar permisos.
- **IMqttService.js:** define la abstracción del servicio MQTT.

### Servicios de aplicación

- **IMqttService.js:** define la abstracción del servicio MQTT.
- **AuthSessionService.js:** ofrece servicio de autenticación: Auth Session Service.
- **PasswordPolicy.js:** ofrece servicio de autenticación: Password Policy.
- **PasswordTokenService.js:** ofrece servicio de autenticación: Password Token Service.
- **NotificationService.js:** coordina el envío de notificaciones por el puerto configurado.
- **AccountAdminService.js:** coordina operaciones administrativas del ciclo de vida de cuentas.

### Casos de uso

- **ActuatorOperations.js:** implementa el caso de uso Actuator Operations del dominio actuator.
- **CreateAlertRule.js:** implementa el caso de uso Create Alert Rule del dominio alert.
- **DeleteAlertRule.js:** implementa el caso de uso Delete Alert Rule del dominio alert.
- **DeleteThresholdConfiguration.js:** implementa el caso de uso Delete Threshold Configuration del dominio alert.
- **GetPendingAlerts.js:** implementa el caso de uso Get Pending Alerts del dominio alert.
- **GetThresholdConfiguration.js:** implementa el caso de uso Get Threshold Configuration del dominio alert.
- **ListAlertHistory.js:** implementa el caso de uso List Alert History del dominio alert.
- **ListAlertRules.js:** implementa el caso de uso List Alert Rules del dominio alert.
- **SaveThresholdConfiguration.js:** implementa el caso de uso Save Threshold Configuration del dominio alert.
- **UpdateAlertRule.js:** implementa el caso de uso Update Alert Rule del dominio alert.
- **UpdateAlertStatus.js:** implementa el caso de uso Update Alert Status del dominio alert.
- **ListAuditLogs.js:** implementa el caso de uso List Audit Logs del dominio audit.
- **ChangePassword.js:** implementa el caso de uso Change Password del dominio auth.
- **GetPasswordResetContext.js:** implementa el caso de uso Get Password Reset Context del dominio auth.
- **LoginUser.js:** implementa el caso de uso Login User del dominio auth.
- **RegisterUser.js:** implementa el caso de uso Register User del dominio auth.
- **RequestPasswordReset.js:** implementa el caso de uso Request Password Reset del dominio auth.
- **ResendEmailVerification.js:** implementa el caso de uso Resend Email Verification del dominio auth.
- **ResetPassword.js:** implementa el caso de uso Reset Password del dominio auth.
- **VerifyEmail.js:** implementa el caso de uso Verify Email del dominio auth.
- **GetBudgetStatus.js:** implementa el caso de uso Get Budget Status del dominio consumption.
- **GetConsumptionSeries.js:** implementa el caso de uso Get Consumption Series del dominio consumption.
- **GetConsumptionSummary.js:** implementa el caso de uso Get Consumption Summary del dominio consumption.
- **GetDailyConsumption.js:** implementa el caso de uso Get Daily Consumption del dominio consumption.
- **GetHourlyConsumption.js:** implementa el caso de uso Get Hourly Consumption del dominio consumption.
- **GetMonthlyConsumption.js:** implementa el caso de uso Get Monthly Consumption del dominio consumption.
- **GetPeriodCost.js:** implementa el caso de uso Get Period Cost del dominio consumption.
- **ClaimDeviceHardware.js:** implementa el caso de uso Claim Device Hardware del dominio device.
- **DeactivateDevice.js:** implementa el caso de uso Deactivate Device del dominio device.
- **DeleteDevice.js:** implementa el caso de uso Delete Device del dominio device.
- **GetDevice.js:** implementa el caso de uso Get Device del dominio device.
- **GetDeviceByHardware.js:** implementa el caso de uso Get Device By Hardware del dominio device.
- **GetLatestDeviceTelemetry.js:** implementa el caso de uso Get Latest Device Telemetry del dominio device.
- **LinkDeviceToHome.js:** implementa el caso de uso Link Device To Home del dominio device.
- **ListDeviceTelemetry.js:** implementa el caso de uso List Device Telemetry del dominio device.
- **ListUserDevices.js:** implementa el caso de uso List User Devices del dominio device.
- **RegisterDevice.js:** implementa el caso de uso Register Device del dominio device.
- **UnlinkDeviceFromHome.js:** implementa el caso de uso Unlink Device From Home del dominio device.
- **UpdateDevice.js:** implementa el caso de uso Update Device del dominio device.
- **UpdateDeviceConfig.js:** implementa el caso de uso Update Device Config del dominio device.
- **UpdateDeviceProvisioning.js:** implementa el caso de uso Update Device Provisioning del dominio device.
- **UpdateDeviceStatus.js:** implementa el caso de uso Update Device Status del dominio device.
- **CreateGoal.js:** implementa el caso de uso Create Goal del dominio goal.
- **DeleteGoal.js:** implementa el caso de uso Delete Goal del dominio goal.
- **GetGoal.js:** implementa el caso de uso Get Goal del dominio goal.
- **GetGoalProgress.js:** implementa el caso de uso Get Goal Progress del dominio goal.
- **ListGoals.js:** implementa el caso de uso List Goals del dominio goal.
- **UpdateGoal.js:** implementa el caso de uso Update Goal del dominio goal.
- **AddHomeMember.js:** implementa el caso de uso Add Home Member del dominio home.
- **AnswerHomeMembership.js:** implementa el caso de uso Answer Home Membership del dominio home.
- **ChangeHomeMemberRole.js:** implementa el caso de uso Change Home Member Role del dominio home.
- **CreateHome.js:** implementa el caso de uso Create Home del dominio home.
- **GetHome.js:** implementa el caso de uso Get Home del dominio home.
- **ListHomeMembers.js:** implementa el caso de uso List Home Members del dominio home.
- **ListHomeMembershipRequests.js:** implementa el caso de uso List Home Membership Requests del dominio home.
- **ListUserHomes.js:** implementa el caso de uso List User Homes del dominio home.
- **RemoveHomeMember.js:** implementa el caso de uso Remove Home Member del dominio home.
- **RequestHomeMembership.js:** implementa el caso de uso Request Home Membership del dominio home.
- **UpdateHome.js:** implementa el caso de uso Update Home del dominio home.
- **PrivacyOperations.js:** implementa el caso de uso Privacy Operations del dominio privacy.
- **RecommendationOperations.js:** implementa el caso de uso Recommendation Operations del dominio recommendation.
- **GenerateConsumptionReport.js:** implementa el caso de uso Generate Consumption Report del dominio report.
- **ReportOperations.js:** implementa el caso de uso Report Operations del dominio report.
- **RoleOperations.js:** implementa el caso de uso Role Operations del dominio role.
- **GetCurrentHomeTariff.js:** implementa el caso de uso Get Current Home Tariff del dominio tariff.
- **IngestReading.js:** implementa el caso de uso Ingest Reading del dominio telemetry.
- **TicketOperations.js:** implementa el caso de uso Ticket Operations del dominio ticket.
- **GetAuthorizationContext.js:** implementa el caso de uso Get Authorization Context del dominio user.
- **GetCurrentUser.js:** implementa el caso de uso Get Current User del dominio user.
- **GetNotificationPreferences.js:** implementa el caso de uso Get Notification Preferences del dominio user.
- **GetUserPreferences.js:** implementa el caso de uso Get User Preferences del dominio user.
- **UpdateCurrentUser.js:** implementa el caso de uso Update Current User del dominio user.
- **UpdateNotificationPreferences.js:** implementa el caso de uso Update Notification Preferences del dominio user.
- **UpdateUserPreferences.js:** implementa el caso de uso Update User Preferences del dominio user.
- **DeleteVacationMode.js:** implementa el caso de uso Delete Vacation Mode del dominio vacation.
- **GetVacationMode.js:** implementa el caso de uso Get Vacation Mode del dominio vacation.
- **SaveVacationMode.js:** implementa el caso de uso Save Vacation Mode del dominio vacation.

### Validación

- **DateRangeValidation.js:** valida rangos de fechas usados por casos de consumo y reportes.


## Regla de mantenimiento

Cuando se añada una función, crea o ajusta primero el caso de uso y el puerto
si depende de I/O. Después implementa o actualiza el adaptador de
infraestructura y, por último, la ruta/controlador. Así se conserva la
independencia de la aplicación frente a Express, PostgreSQL y MQTT.
