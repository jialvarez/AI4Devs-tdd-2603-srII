import { validateCandidateData } from '../application/validator';
import { addCandidate } from '../application/services/candidateService';
import { Candidate } from '../domain/models/Candidate';
import { Education } from '../domain/models/Education';
import { WorkExperience } from '../domain/models/WorkExperience';
import { Resume } from '../domain/models/Resume';

jest.mock('../domain/models/Candidate');
jest.mock('../domain/models/Education');
jest.mock('../domain/models/WorkExperience');
jest.mock('../domain/models/Resume');

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
  Prisma: {
    PrismaClientInitializationError: class PrismaClientInitializationError extends Error {
      constructor() {
        super('Database connection failed');
        this.name = 'PrismaClientInitializationError';
      }
    },
  },
}));

const MockCandidate = Candidate as jest.MockedClass<typeof Candidate>;
const MockEducation = Education as jest.MockedClass<typeof Education>;
const MockWorkExperience = WorkExperience as jest.MockedClass<typeof WorkExperience>;
const MockResume = Resume as jest.MockedClass<typeof Resume>;

const validCandidatePayload = {
  firstName: 'María',
  lastName: 'López',
  email: 'maria.lopez@example.com',
  phone: '612345678',
  address: 'Calle Gran Vía 10',
};

const createdCandidateRecord = {
  id: 42,
  firstName: validCandidatePayload.firstName,
  lastName: validCandidatePayload.lastName,
  email: validCandidatePayload.email,
  phone: validCandidatePayload.phone,
  address: validCandidatePayload.address,
};

function setupPersistenceMocks(
  candidateSaveImpl: jest.Mock = jest.fn().mockResolvedValue(createdCandidateRecord)
) {
  MockCandidate.mockImplementation(function (this: Candidate, data: Record<string, unknown>) {
    this.education = [];
    this.workExperience = [];
    this.resumes = [];
    this.save = candidateSaveImpl;
    Object.assign(this, data);
    return this;
  });

  MockEducation.mockImplementation(function (this: Education, data: Record<string, unknown>) {
    this.save = jest.fn().mockResolvedValue({ id: 1, ...data });
    return this;
  });

  MockWorkExperience.mockImplementation(function (this: WorkExperience, data: Record<string, unknown>) {
    this.save = jest.fn().mockResolvedValue({ id: 1, ...data });
    return this;
  });

  MockResume.mockImplementation(function (this: Resume, data: Record<string, unknown>) {
    this.save = jest.fn().mockResolvedValue({
      id: 1,
      candidateId: 42,
      filePath: data.filePath,
      fileType: data.fileType,
      uploadDate: new Date(),
    });
    return this;
  });
}

describe('Candidate insertion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Candidate Form Reception', () => {
    describe('success cases', () => {
      it('should accept a clean valid payload without throwing', () => {
        // Arrange
        const payload = { ...validCandidatePayload };

        // Act & Assert
        expect(() => validateCandidateData(payload)).not.toThrow();
      });

      it('should accept payload with optional nested sections when valid', () => {
        // Arrange
        const payload = {
          ...validCandidatePayload,
          educations: [
            {
              institution: 'Universidad Complutense',
              title: 'Ingeniería Informática',
              startDate: '2018-09-01',
              endDate: '2022-06-30',
            },
          ],
          workExperiences: [
            {
              company: 'Tech Corp',
              position: 'Developer',
              description: 'Backend development',
              startDate: '2022-07-01',
            },
          ],
          cv: {
            filePath: '/uploads/123-cv.pdf',
            fileType: 'application/pdf',
          },
        };

        // Act & Assert
        expect(() => validateCandidateData(payload)).not.toThrow();
      });
    });

    describe('error cases', () => {
      it('should reject an empty payload with missing required fields', () => {
        // Arrange
        const emptyPayload = {};

        // Act & Assert
        expect(() => validateCandidateData(emptyPayload)).toThrow('Invalid name');
      });

      it('should reject payload with invalid email format', () => {
        // Arrange
        const payload = {
          ...validCandidatePayload,
          email: 'not-an-email',
        };

        // Act & Assert
        expect(() => validateCandidateData(payload)).toThrow('Invalid email');
      });

      it('should reject payload with incorrect phone format', () => {
        // Arrange
        const payload = {
          ...validCandidatePayload,
          phone: '12345',
        };

        // Act & Assert
        expect(() => validateCandidateData(payload)).toThrow('Invalid phone');
      });

      it('should reject payload with invalid CV data types', () => {
        // Arrange
        const payload = {
          ...validCandidatePayload,
          cv: { filePath: 12345, fileType: null },
        };

        // Act & Assert
        expect(() => validateCandidateData(payload)).toThrow('Invalid CV data');
      });

      it('should wrap validation errors when addCandidate receives invalid data', async () => {
        // Arrange
        setupPersistenceMocks();
        const invalidPayload = { firstName: 'A', lastName: 'Test', email: 'bad' };

        // Act & Assert
        await expect(addCandidate(invalidPayload)).rejects.toThrow(/Invalid/);
        expect(MockCandidate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Candidate Database Persistence', () => {
    beforeEach(() => {
      setupPersistenceMocks();
    });

    describe('success cases', () => {
      it('should persist candidate and return the created record with id', async () => {
        // Arrange
        const mockSave = jest.fn().mockResolvedValue(createdCandidateRecord);
        setupPersistenceMocks(mockSave);
        const payload = { ...validCandidatePayload };

        // Act
        const result = await addCandidate(payload);

        // Assert
        expect(MockCandidate).toHaveBeenCalledWith(payload);
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(result).toEqual(createdCandidateRecord);
        expect(result.id).toBe(42);
      });

      it('should persist nested educations and work experiences linked to candidate id', async () => {
        // Arrange
        const mockSave = jest.fn().mockResolvedValue(createdCandidateRecord);
        setupPersistenceMocks(mockSave);
        const payload = {
          ...validCandidatePayload,
          educations: [
            {
              institution: 'Universidad Complutense',
              title: 'Ingeniería',
              startDate: '2018-09-01',
            },
          ],
          workExperiences: [
            {
              company: 'Tech Corp',
              position: 'Developer',
              startDate: '2022-07-01',
            },
          ],
        };

        // Act
        const result = await addCandidate(payload);

        // Assert
        expect(result.id).toBe(42);
        expect(MockEducation).toHaveBeenCalledTimes(1);
        expect(MockWorkExperience).toHaveBeenCalledTimes(1);

        const educationInstance = MockEducation.mock.instances[0] as Education & {
          save: jest.Mock;
          candidateId: number;
        };
        const experienceInstance = MockWorkExperience.mock.instances[0] as WorkExperience & {
          save: jest.Mock;
          candidateId: number;
        };

        expect(educationInstance.candidateId).toBe(42);
        expect(experienceInstance.candidateId).toBe(42);
        expect(educationInstance.save).toHaveBeenCalledTimes(1);
        expect(experienceInstance.save).toHaveBeenCalledTimes(1);
      });

      it('should persist CV metadata when provided', async () => {
        // Arrange
        const mockSave = jest.fn().mockResolvedValue(createdCandidateRecord);
        setupPersistenceMocks(mockSave);
        const payload = {
          ...validCandidatePayload,
          cv: {
            filePath: '/uploads/99-resume.pdf',
            fileType: 'application/pdf',
          },
        };

        // Act
        await addCandidate(payload);

        // Assert
        expect(MockResume).toHaveBeenCalledWith(payload.cv);
        const resumeInstance = MockResume.mock.instances[0] as Resume & {
          save: jest.Mock;
          candidateId: number;
        };
        expect(resumeInstance.candidateId).toBe(42);
        expect(resumeInstance.save).toHaveBeenCalledTimes(1);
      });
    });

    describe('error cases', () => {
      it('should map duplicate email constraint P2002 to a friendly error', async () => {
        // Arrange
        const duplicateEmailError = Object.assign(new Error('Unique constraint failed'), {
          code: 'P2002',
        });
        const mockSave = jest.fn().mockRejectedValue(duplicateEmailError);
        setupPersistenceMocks(mockSave);

        // Act & Assert
        await expect(addCandidate(validCandidatePayload)).rejects.toThrow(
          'The email already exists in the database'
        );
        expect(mockSave).toHaveBeenCalledTimes(1);
      });

      it('should rethrow database connection errors without swallowing them', async () => {
        // Arrange
        const connectionError = new Error(
          'No se pudo conectar con la base de datos. Por favor, asegúrese de que el servidor de base de datos esté en ejecución.'
        );
        const mockSave = jest.fn().mockRejectedValue(connectionError);
        setupPersistenceMocks(mockSave);

        // Act & Assert
        await expect(addCandidate(validCandidatePayload)).rejects.toThrow(connectionError.message);
        expect(mockSave).toHaveBeenCalledTimes(1);
      });

      it('should propagate unexpected database errors', async () => {
        // Arrange
        const unexpectedError = Object.assign(new Error('Unexpected DB failure'), {
          code: 'P2003',
        });
        const mockSave = jest.fn().mockRejectedValue(unexpectedError);
        setupPersistenceMocks(mockSave);

        // Act & Assert
        await expect(addCandidate(validCandidatePayload)).rejects.toThrow('Unexpected DB failure');
      });
    });
  });
});
