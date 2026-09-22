// LAB 3 - the "shape" of the data we move between screens.

// Everything the student types on the Registration Screen.
// Note: the password is deliberately NOT included. We never carry a
// password to another screen just to display it.
export type Student = {
  fullName: string;
  age: string;
  studentId: string;
  course: string;
  phone: string;
  email: string;
  gender: string;
  notifications: boolean;
  agreed: boolean;
};

// The list of screens in our stack, and what each one expects to receive.
// "undefined" means that screen takes no parameters.
export type LabStackParamList = {
  Registration: undefined;
  Summary: { student: Student };
  Welcome: { student: Student };
};
